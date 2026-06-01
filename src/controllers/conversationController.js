const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const conversationService = require('../services/conversationService');

const createConversation = asyncHandler(async (req, res) => {
  const conversation = await conversationService.createConversation({
    currentUserId: req.user.id,
    userId: req.body.userId
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Conversation created successfully',
    data: conversation
  });
});

const getConversationList = asyncHandler(async (req, res) => {
  const conversations = await conversationService.getConversationList(req.user.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Conversations retrieved successfully',
    data: conversations
  });
});

module.exports = {
  createConversation,
  getConversationList
};
