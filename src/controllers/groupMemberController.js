const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const membershipService = require('../services/membershipService');

const addMembers = asyncHandler(async (req, res) => {
  const members = await membershipService.addMembers({
    groupId: req.params.id,
    actorUserId: req.user.id,
    userIds: req.body.userIds || []
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Members added successfully',
    data: members
  });
});

const removeMember = asyncHandler(async (req, res) => {
  const member = await membershipService.removeMember({
    groupId: req.params.id,
    actorUserId: req.user.id,
    targetUserId: req.params.userId
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Member removed successfully',
    data: member
  });
});

const leaveGroup = asyncHandler(async (req, res) => {
  const member = await membershipService.leaveGroup({
    groupId: req.params.id,
    actorUserId: req.user.id
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Left group successfully',
    data: member
  });
});

module.exports = {
  addMembers,
  leaveGroup,
  removeMember
};