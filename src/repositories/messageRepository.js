const { query, withTransaction } = require('../config/db');

const mapMessage = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    messageType: row.message_type,
    body: row.body,
    clientMessageId: row.client_message_id,
    metadata: row.metadata,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const createMessage = async ({ conversationId, senderId, body, clientMessageId }) => {
  return withTransaction(async (client) => {
    let insertResult;

    if (clientMessageId) {
      insertResult = await client.query(
        `
          INSERT INTO messages (conversation_id, sender_id, body, client_message_id)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (conversation_id, client_message_id) WHERE client_message_id IS NOT NULL DO NOTHING
          RETURNING id, conversation_id, sender_id, message_type, body, client_message_id, metadata, edited_at, deleted_at, created_at, updated_at
        `,
        [conversationId, senderId, body, clientMessageId]
      );
    } else {
      insertResult = await client.query(
        `
          INSERT INTO messages (conversation_id, sender_id, body)
          VALUES ($1, $2, $3)
          RETURNING id, conversation_id, sender_id, message_type, body, client_message_id, metadata, edited_at, deleted_at, created_at, updated_at
        `,
        [conversationId, senderId, body]
      );
    }

    let row = insertResult.rows[0] || null;
    let isDuplicate = false;

    if (!row && clientMessageId) {
      const existingResult = await client.query(
        `
          SELECT id, conversation_id, sender_id, message_type, body, client_message_id, metadata, edited_at, deleted_at, created_at, updated_at
          FROM messages
          WHERE conversation_id = $1
            AND client_message_id = $2
          LIMIT 1
        `,
        [conversationId, clientMessageId]
      );

      row = existingResult.rows[0] || null;
      isDuplicate = Boolean(row);
    }

    if (!row) {
      throw new Error('Failed to persist message');
    }

    await client.query(
      `
        UPDATE conversations
        SET last_message_id = $1
        WHERE id = $2
      `,
      [row.id, conversationId]
    );

    return {
      message: mapMessage(row),
      isDuplicate
    };
  });
};

const listMessagesByConversation = async ({ conversationId, limit = 50, before = null }) => {
  const result = await query(
    `
      SELECT id, conversation_id, sender_id, message_type, body, client_message_id, metadata, edited_at, deleted_at, created_at, updated_at
      FROM messages
      WHERE conversation_id = $1
        AND deleted_at IS NULL
        AND ($2::timestamptz IS NULL OR created_at < $2::timestamptz)
      ORDER BY created_at DESC
      LIMIT $3
    `,
    [conversationId, before, limit]
  );

  return result.rows.map(mapMessage).reverse();
};

module.exports = {
  createMessage,
  listMessagesByConversation,
  mapMessage
};
