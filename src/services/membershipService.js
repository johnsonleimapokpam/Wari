const ApiError = require('../utils/ApiError');
const groupRepository = require('../repositories/groupRepository');

const ensureActiveMember = async (groupId, userId) => {
  const member = await groupRepository.getMemberRow(groupId, userId);

  if (!member || member.left_at) {
    throw new ApiError(403, 'You are not a member of this group', { code: 'NOT_A_GROUP_MEMBER' });
  }

  return member;
};

const addMembers = async ({ groupId, actorUserId, userIds = [] }) => {
  const actorMember = await ensureActiveMember(groupId, actorUserId);

  if (!['OWNER', 'ADMIN'].includes(actorMember.role)) {
    throw new ApiError(403, 'Insufficient permissions to add members', { code: 'INSUFFICIENT_GROUP_ROLE' });
  }

  const uniqueUserIds = Array.from(new Set(userIds.filter((userId) => userId !== actorUserId)));

  return Promise.all(
    uniqueUserIds.map((userId) => groupRepository.upsertMember({
      groupId,
      userId,
      role: 'MEMBER',
      addedByUserId: actorUserId
    }))
  );
};

const removeMember = async ({ groupId, actorUserId, targetUserId }) => {
  const actorMember = await ensureActiveMember(groupId, actorUserId);
  const targetMember = await ensureActiveMember(groupId, targetUserId);

  if (targetMember.role === 'OWNER') {
    throw new ApiError(403, 'Owner cannot be removed directly', { code: 'OWNER_REMOVAL_NOT_ALLOWED' });
  }

  if (actorMember.role === 'ADMIN' && targetMember.role === 'ADMIN') {
    throw new ApiError(403, 'Admin cannot remove another admin', { code: 'INSUFFICIENT_GROUP_ROLE' });
  }

  if (!['OWNER', 'ADMIN'].includes(actorMember.role)) {
    throw new ApiError(403, 'Insufficient permissions to remove members', { code: 'INSUFFICIENT_GROUP_ROLE' });
  }

  return groupRepository.removeMember({ groupId, userId: targetUserId });
};

const leaveGroup = async ({ groupId, actorUserId }) => {
  const actorMember = await ensureActiveMember(groupId, actorUserId);
  const members = await groupRepository.listGroupMembers(groupId);
  const activeMembers = members.filter((member) => !member.left_at);

  if (actorMember.role === 'OWNER' && activeMembers.length > 1) {
    const nextOwner = activeMembers.find((member) => member.role === 'ADMIN' && member.user_id !== actorUserId)
      || activeMembers.find((member) => member.user_id !== actorUserId);

    if (nextOwner) {
      await groupRepository.setMemberRole({ groupId, userId: nextOwner.user_id, role: 'OWNER' });
      await groupRepository.setMemberRole({ groupId, userId: actorUserId, role: 'MEMBER' });
    }
  }

  return groupRepository.removeMember({ groupId, userId: actorUserId });
};

const getMemberRole = async ({ groupId, userId }) => {
  const member = await groupRepository.getMemberRow(groupId, userId);

  if (!member || member.left_at) {
    return null;
  }

  return member.role;
};

module.exports = {
  addMembers,
  ensureActiveMember,
  getMemberRole,
  leaveGroup,
  removeMember
};