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
    metadata: row.metadata,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const createMessage = async ({ conversationId, senderId, body }) => {
  return withTransaction(async (client) => {
    const result = await client.query(
      `
        INSERT INTO messages (conversation_id, sender_id, body)
        VALUES ($1, $2, $3)
        RETURNING id, conversation_id, sender_id, message_type, body, metadata, edited_at, deleted_at, created_at, updated_at
      `,
      [conversationId, senderId, body]
    );

    await client.query(
      `
        UPDATE conversations
        SET last_message_id = $1
        WHERE id = $2
      `,
      [result.rows[0].id, conversationId]
    );

    return mapMessage(result.rows[0]);
  });
};

const listMessagesByConversation = async ({ conversationId, limit = 50, before = null }) => {
  const result = await query(
    `
      SELECT id, conversation_id, sender_id, message_type, body, metadata, edited_at, deleted_at, created_at, updated_at
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
