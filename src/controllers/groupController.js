const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const groupService = require('../services/groupService');

const createGroup = asyncHandler(async (req, res) => {
  const group = await groupService.createGroup({
    ownerUserId: req.user.id,
    title: req.body.title,
    description: req.body.description,
    avatarUrl: req.body.avatarUrl,
    memberIds: req.body.memberIds || []
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Group created successfully',
    data: group
  });
});

const getGroup = asyncHandler(async (req, res) => {
  const group = await groupService.getGroup(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Group retrieved successfully',
    data: group
  });
});

const renameGroup = asyncHandler(async (req, res) => {
  const group = await groupService.renameGroup({
    groupId: req.params.id,
    actorUserId: req.user.id,
    title: req.body.title,
    description: req.body.description,
    avatarUrl: req.body.avatarUrl
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Group updated successfully',
    data: group
  });
});

const deleteGroup = asyncHandler(async (req, res) => {
  const group = await groupService.deleteGroup({
    groupId: req.params.id,
    actorUserId: req.user.id
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Group deleted successfully',
    data: group
  });
});

const listMembers = asyncHandler(async (req, res) => {
  const members = await groupService.listMembers(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Group members retrieved successfully',
    data: members
  });
});

module.exports = {
  createGroup,
  deleteGroup,
  getGroup,
  listMembers,
  renameGroup
};