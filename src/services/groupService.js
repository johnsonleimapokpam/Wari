const ApiError = require('../utils/ApiError');
const groupRepository = require('../repositories/groupRepository');
const conversationRepository = require('../repositories/conversationRepository');

const ensureGroup = async (groupId) => {
  const group = await groupRepository.findGroupById(groupId);

  if (!group) {
    throw new ApiError(404, 'Group not found', { code: 'GROUP_NOT_FOUND' });
  }

  return group;
};

const createGroup = async ({ ownerUserId, title, description, avatarUrl, memberIds = [] }) => {
  if (!title || !title.trim()) {
    throw new ApiError(400, 'Group title is required', { code: 'GROUP_TITLE_REQUIRED' });
  }

  return groupRepository.createGroup({
    ownerUserId,
    title: title.trim(),
    description: description || null,
    avatarUrl: avatarUrl || null,
    memberIds
  });
};

const getGroup = async (groupId) => {
  return ensureGroup(groupId);
};

const renameGroup = async ({ groupId, actorUserId, title, description, avatarUrl }) => {
  const member = await groupRepository.getMemberRow(groupId, actorUserId);
  const group = await ensureGroup(groupId);

  if (!member || member.left_at) {
    throw new ApiError(403, 'You are not a member of this group', { code: 'NOT_A_GROUP_MEMBER' });
  }

  if (!['OWNER', 'ADMIN'].includes(member.role)) {
    throw new ApiError(403, 'Insufficient permissions to rename group', { code: 'INSUFFICIENT_GROUP_ROLE' });
  }

  return groupRepository.renameGroup({ groupId, title, description, avatarUrl });
};

const deleteGroup = async ({ groupId, actorUserId }) => {
  const member = await groupRepository.getMemberRow(groupId, actorUserId);
  await ensureGroup(groupId);

  if (!member || member.left_at) {
    throw new ApiError(403, 'You are not a member of this group', { code: 'NOT_A_GROUP_MEMBER' });
  }

  if (member.role !== 'OWNER') {
    throw new ApiError(403, 'Only the owner can delete the group', { code: 'INSUFFICIENT_GROUP_ROLE' });
  }

  await groupRepository.markAllMembersLeft(groupId);
  return groupRepository.deleteGroup({ groupId });
};

const listMembers = async (groupId) => {
  await ensureGroup(groupId);
  return groupRepository.listGroupMembers(groupId);
};

module.exports = {
  createGroup,
  deleteGroup,
  getGroup,
  listMembers,
  renameGroup
};