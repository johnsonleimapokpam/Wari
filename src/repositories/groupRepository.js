const { query, withTransaction } = require('../config/db');

const mapGroup = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    conversationType: row.conversation_type,
    title: row.title,
    description: row.description,
    avatarUrl: row.avatar_url,
    ownerUserId: row.owner_user_id,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at
  };
};

const createGroup = async ({ ownerUserId, title, description, avatarUrl, memberIds = [] }) => {
  return withTransaction(async (client) => {
    const conversationResult = await client.query(
      `
        INSERT INTO conversations (conversation_type, title, description, avatar_url, owner_user_id, created_by_user_id)
        VALUES ('group', $1, $2, $3, $4, $4)
        RETURNING id, conversation_type, title, description, avatar_url, owner_user_id, created_by_user_id, created_at, updated_at, archived_at, deleted_at
      `,
      [title, description || null, avatarUrl || null, ownerUserId]
    );

    const group = conversationResult.rows[0];
    const uniqueMemberIds = Array.from(new Set([ownerUserId, ...memberIds.filter(Boolean)]));
    const memberValues = [];
    const memberPlaceholders = [];

    uniqueMemberIds.forEach((memberId, index) => {
      const base = index * 4;
      const role = memberId === ownerUserId ? 'OWNER' : 'MEMBER';
      memberPlaceholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
      memberValues.push(group.id, memberId, role, ownerUserId);
    });

    await client.query(
      `
        INSERT INTO conversation_members (conversation_id, user_id, role, added_by_user_id)
        VALUES ${memberPlaceholders.join(', ')}
        ON CONFLICT (conversation_id, user_id) DO UPDATE
        SET left_at = NULL,
            role = EXCLUDED.role,
            added_by_user_id = EXCLUDED.added_by_user_id
      `,
      memberValues
    );

    return group;
  });
};

const findGroupById = async (groupId) => {
  const result = await query(
    `
      SELECT id, conversation_type, title, description, avatar_url, owner_user_id, created_by_user_id, created_at, updated_at, archived_at, deleted_at
      FROM conversations
      WHERE id = $1
        AND conversation_type = 'group'
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [groupId]
  );

  return mapGroup(result.rows[0]);
};

const renameGroup = async ({ groupId, title, description, avatarUrl }) => {
  const result = await query(
    `
      UPDATE conversations
      SET title = COALESCE($2, title),
          description = COALESCE($3, description),
          avatar_url = COALESCE($4, avatar_url)
      WHERE id = $1
        AND conversation_type = 'group'
        AND deleted_at IS NULL
      RETURNING id, conversation_type, title, description, avatar_url, owner_user_id, created_by_user_id, created_at, updated_at, archived_at, deleted_at
    `,
    [groupId, title || null, description || null, avatarUrl || null]
  );

  return mapGroup(result.rows[0]);
};

const deleteGroup = async ({ groupId }) => {
  const result = await query(
    `
      UPDATE conversations
      SET deleted_at = NOW(),
          archived_at = NOW()
      WHERE id = $1
        AND conversation_type = 'group'
        AND deleted_at IS NULL
      RETURNING id, conversation_type, title, description, avatar_url, owner_user_id, created_by_user_id, created_at, updated_at, archived_at, deleted_at
    `,
    [groupId]
  );

  return mapGroup(result.rows[0]);
};

const listGroupMembers = async (groupId) => {
  const result = await query(
    `
      SELECT
        cm.conversation_id,
        cm.user_id,
        cm.role,
        cm.joined_at,
        cm.left_at,
        u.email,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.last_seen
      FROM conversation_members cm
      INNER JOIN users u ON u.id = cm.user_id
      INNER JOIN conversations c ON c.id = cm.conversation_id
      WHERE cm.conversation_id = $1
        AND c.conversation_type = 'group'
      ORDER BY cm.role ASC, cm.joined_at ASC
    `,
    [groupId]
  );

  return result.rows;
};

const getMemberRow = async (groupId, userId) => {
  const result = await query(
    `
      SELECT conversation_id, user_id, role, joined_at, left_at, added_by_user_id
      FROM conversation_members
      WHERE conversation_id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [groupId, userId]
  );

  return result.rows[0] || null;
};

const setMemberRole = async ({ groupId, userId, role }) => {
  const result = await query(
    `
      UPDATE conversation_members
      SET role = $3
      WHERE conversation_id = $1
        AND user_id = $2
        AND left_at IS NULL
      RETURNING conversation_id, user_id, role, joined_at, left_at, added_by_user_id
    `,
    [groupId, userId, role]
  );

  return result.rows[0] || null;
};

const upsertMember = async ({ groupId, userId, role = 'MEMBER', addedByUserId }) => {
  const result = await query(
    `
      INSERT INTO conversation_members (conversation_id, user_id, role, added_by_user_id, left_at)
      VALUES ($1, $2, $3, $4, NULL)
      ON CONFLICT (conversation_id, user_id) DO UPDATE
      SET left_at = NULL,
          role = EXCLUDED.role,
          added_by_user_id = EXCLUDED.added_by_user_id
      RETURNING conversation_id, user_id, role, joined_at, left_at, added_by_user_id
    `,
    [groupId, userId, role, addedByUserId]
  );

  return result.rows[0];
};

const removeMember = async ({ groupId, userId }) => {
  const result = await query(
    `
      UPDATE conversation_members
      SET left_at = NOW()
      WHERE conversation_id = $1
        AND user_id = $2
        AND left_at IS NULL
      RETURNING conversation_id, user_id, role, joined_at, left_at, added_by_user_id
    `,
    [groupId, userId]
  );

  return result.rows[0] || null;
};

const markAllMembersLeft = async (groupId) => {
  await query(
    `
      UPDATE conversation_members
      SET left_at = NOW()
      WHERE conversation_id = $1
        AND left_at IS NULL
    `,
    [groupId]
  );
};

module.exports = {
  createGroup,
  deleteGroup,
  findGroupById,
  getMemberRow,
  listGroupMembers,
  mapGroup,
  markAllMembersLeft,
  removeMember,
  renameGroup,
  setMemberRole,
  upsertMember
};