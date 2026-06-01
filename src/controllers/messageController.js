const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const messageService = require('../services/messageService');

const sendMessage = asyncHandler(async (req, res) => {
  const message = await messageService.sendMessage({
    conversationId: req.body.conversationId,
    senderId: req.user.id,
    body: req.body.body
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Message sent successfully',
    data: message
  });
});

const getMessageHistory = asyncHandler(async (req, res) => {
  const messages = await messageService.getMessageHistory({
    conversationId: req.params.conversationId,
    userId: req.user.id,
    limit: req.query.limit,
    before: req.query.before
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Messages retrieved successfully',
    data: messages,
    meta: {
      count: messages.length
    }
  });
});

module.exports = {
  sendMessage,
  getMessageHistory
};
