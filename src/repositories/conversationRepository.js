const { query, withTransaction } = require('../config/db');

const mapConversation = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    conversationType: row.conversation_type,
    directKey: row.direct_key,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    lastMessage: row.last_message_id
      ? {
          id: row.last_message_id,
          body: row.last_message_body,
          createdAt: row.last_message_created_at,
          senderId: row.last_message_sender_id
        }
      : null,
    otherParticipant: row.other_user_id
      ? {
          id: row.other_user_id,
          email: row.other_user_email,
          firstName: row.other_user_first_name,
          lastName: row.other_user_last_name,
          avatarUrl: row.other_user_avatar_url
        }
      : null
  };
};

const findConversationById = async (conversationId) => {
  const result = await query(
    `
      SELECT id, conversation_type, direct_key, created_by_user_id, last_message_id, created_at, updated_at, archived_at
      FROM conversations
      WHERE id = $1 AND archived_at IS NULL
      LIMIT 1
    `,
    [conversationId]
  );

  return result.rows[0] || null;
};

const findConversationMember = async (conversationId, userId) => {
  const result = await query(
    `
      SELECT conversation_id, user_id, joined_at, last_read_message_id, last_read_at, is_muted, is_archived
      FROM conversation_members
      WHERE conversation_id = $1 AND user_id = $2
      LIMIT 1
    `,
    [conversationId, userId]
  );

  return result.rows[0] || null;
};

const findOtherConversationMemberUserId = async (conversationId, userId) => {
  const result = await query(
    `
      SELECT user_id
      FROM conversation_members
      WHERE conversation_id = $1
        AND user_id <> $2
      LIMIT 1
    `,
    [conversationId, userId]
  );

  return result.rows[0] || null;
};

const findDirectConversationByKey = async (directKey) => {
  const result = await query(
    `
      SELECT id, conversation_type, direct_key, created_by_user_id, last_message_id, created_at, updated_at, archived_at
      FROM conversations
      WHERE direct_key = $1 AND archived_at IS NULL
      LIMIT 1
    `,
    [directKey]
  );

  return result.rows[0] || null;
};

const createDirectConversation = async ({ createdByUserId, directKey, memberIds }) => {
  return withTransaction(async (client) => {
    const conversationResult = await client.query(
      `
        INSERT INTO conversations (conversation_type, direct_key, created_by_user_id)
        VALUES ('direct', $1, $2)
        RETURNING id, conversation_type, direct_key, created_by_user_id, last_message_id, created_at, updated_at, archived_at
      `,
      [directKey, createdByUserId]
    );

    const conversation = conversationResult.rows[0];

    await client.query(
      `
        INSERT INTO conversation_members (conversation_id, user_id)
        VALUES ($1, $2), ($1, $3)
      `,
      [conversation.id, memberIds[0], memberIds[1]]
    );

    return conversation;
  });
};

const listConversationsForUser = async (userId) => {
  const result = await query(
    `
      SELECT
        c.id,
        c.conversation_type,
        c.direct_key,
        c.created_by_user_id,
        c.last_message_id,
        c.created_at,
        c.updated_at,
        c.archived_at,
        lm.body AS last_message_body,
        lm.created_at AS last_message_created_at,
        lm.sender_id AS last_message_sender_id,
        other_user.id AS other_user_id,
        other_user.email AS other_user_email,
        other_user.first_name AS other_user_first_name,
        other_user.last_name AS other_user_last_name,
        other_user.avatar_url AS other_user_avatar_url
      FROM conversations c
      INNER JOIN conversation_members me
        ON me.conversation_id = c.id
       AND me.user_id = $1
       AND me.is_archived = false
      INNER JOIN conversation_members other_member
        ON other_member.conversation_id = c.id
       AND other_member.user_id <> $1
      INNER JOIN users other_user
        ON other_user.id = other_member.user_id
      LEFT JOIN messages lm
        ON lm.id = c.last_message_id
      WHERE c.archived_at IS NULL
      ORDER BY COALESCE(lm.created_at, c.updated_at) DESC
    `,
    [userId]
  );

  return result.rows.map(mapConversation);
};

module.exports = {
  createDirectConversation,
  findConversationById,
  findConversationMember,
  findDirectConversationByKey,
  findOtherConversationMemberUserId,
  listConversationsForUser,
  mapConversation
};
