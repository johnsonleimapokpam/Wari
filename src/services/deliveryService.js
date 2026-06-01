const ApiError = require('../utils/ApiError');
const conversationRepository = require('../repositories/conversationRepository');
const messageRepository = require('../repositories/messageRepository');
const { MESSAGE_STATUSES, assertValidTransition } = require('../utils/messageStatus');

const ensureRecipientConversationAccess = async (conversationId, recipientUserId) => {
  const membership = await conversationRepository.findConversationMember(conversationId, recipientUserId);

  if (!membership) {
    throw new ApiError(403, 'You are not a member of this conversation', {
      code: 'NOT_A_CONVERSATION_MEMBER'
    });
  }
};

const markMessageDelivered = async ({ messageId, recipientUserId, deliveredAt = new Date() }) => {
  const message = await messageRepository.findMessageById(messageId);

  if (!message) {
    throw new ApiError(404, 'Message not found', { code: 'MESSAGE_NOT_FOUND' });
  }

  await ensureRecipientConversationAccess(message.conversation_id, recipientUserId);

  if (message.sender_id === recipientUserId) {
    return { message: messageRepository.mapMessage(message), isUpdated: false };
  }

  if (message.status === MESSAGE_STATUSES.DELIVERED || message.status === MESSAGE_STATUSES.READ) {
    return { message: messageRepository.mapMessage(message), isUpdated: false };
  }

  assertValidTransition(message.status, MESSAGE_STATUSES.DELIVERED);

  const updatedMessage = await messageRepository.updateMessageStatus({
    messageId,
    status: MESSAGE_STATUSES.DELIVERED,
    deliveredAt
  });

  return {
    message: messageRepository.mapMessage(updatedMessage),
    isUpdated: Boolean(updatedMessage)
  };
};

const markConversationDelivered = async ({ conversationId, recipientUserId, deliveredAt = new Date() }) => {
  await ensureRecipientConversationAccess(conversationId, recipientUserId);
  return messageRepository.markConversationMessagesDelivered({ conversationId, recipientUserId, deliveredAt });
};

module.exports = {
  markConversationDelivered,
  markMessageDelivered
};