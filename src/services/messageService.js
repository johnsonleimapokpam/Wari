const ApiError = require('../utils/ApiError');
const conversationRepository = require('../repositories/conversationRepository');
const messageRepository = require('../repositories/messageRepository');

const sendMessage = async ({ conversationId, senderId, body, clientMessageId }) => {
  const conversation = await conversationRepository.findConversationById(conversationId);

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found', { code: 'CONVERSATION_NOT_FOUND' });
  }

  const membership = await conversationRepository.findConversationMember(conversationId, senderId);

  if (!membership) {
    throw new ApiError(403, 'You are not a member of this conversation', {
      code: 'NOT_A_CONVERSATION_MEMBER'
    });
  }

  if (conversation.conversation_type === 'group') {
    const groupMessageService = require('./groupMessageService');

    const result = await groupMessageService.createMessage({
      groupId: conversationId,
      senderId,
      body,
      clientMessageId
    });

    return {
      message: result.message,
      isDuplicate: result.isDuplicate,
      conversationType: 'group',
      delivery: {
        recipientCount: result.recipientCount,
        deliveredCount: result.deliveredCount
      }
    };
  }

  const result = await messageRepository.createMessage({
    conversationId,
    senderId,
    body,
    clientMessageId
  });

  return {
    ...result,
    conversationType: 'direct',
    delivery: {
      recipientCount: 1,
      deliveredCount: 0
    }
  };
};

const getMessageHistory = async ({ conversationId, userId, limit, before }) => {
  const conversation = await conversationRepository.findConversationById(conversationId);

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found', { code: 'CONVERSATION_NOT_FOUND' });
  }

  const membership = await conversationRepository.findConversationMember(conversationId, userId);

  if (!membership) {
    throw new ApiError(403, 'You are not a member of this conversation', {
      code: 'NOT_A_CONVERSATION_MEMBER'
    });
  }

  return messageRepository.listMessagesByConversation({
    conversationId,
    limit,
    before: before || null
  });
};

module.exports = {
  sendMessage,
  getMessageHistory
};
