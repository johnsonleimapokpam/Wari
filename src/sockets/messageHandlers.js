const messageService = require('../services/messageService');
const deliveryService = require('../services/deliveryService');
const ApiError = require('../utils/ApiError');
const { sendMessageSchema } = require('./socketSchemas');
const { roomNameForConversation, serializeSocketUser } = require('./roomHandlers');
const conversationRepository = require('../repositories/conversationRepository');
const presenceService = require('../services/presenceService');

const validatePayload = (payload) => {
  const result = sendMessageSchema.safeParse(payload);

  if (!result.success) {
    throw new ApiError(400, 'Invalid socket payload', {
      code: 'SOCKET_VALIDATION_ERROR',
      details: result.error.errors
    });
  }

  return result.data;
};

const emitSocketError = (socket, error, ack) => {
  const payload = {
    success: false,
    message: error.message,
    error: {
      code: error.code,
      details: error.details
    }
  };

  socket.emit('error', payload);

  if (typeof ack === 'function') {
    ack(payload);
  }
};

const emitMessageAndStatus = (io, recipientUserId, senderUserId, message) => {
  io.to(`user:${recipientUserId}`).emit('message_received', {
    message,
    conversationId: message.conversationId,
    sender: { id: senderUserId }
  });

  io.to(`user:${senderUserId}`).emit('message_status_updated', {
    conversationId: message.conversationId,
    messageId: message.id,
    status: message.status,
    deliveredAt: message.deliveredAt,
    readAt: message.readAt,
    senderId: senderUserId,
    recipientId: recipientUserId
  });
};

const registerMessageHandlers = (socket, io) => {
  socket.on('send_message', async (payload, ack) => {
    try {
      const data = validatePayload(payload);

      const result = await messageService.sendMessage({
        conversationId: data.conversationId,
        senderId: socket.data.user.id,
        body: data.body,
        clientMessageId: data.clientMessageId
      });

      const otherMember = await conversationRepository.findOtherConversationMemberUserId(data.conversationId, socket.data.user.id);

      if (!otherMember) {
        throw new ApiError(403, 'Conversation recipient not found', { code: 'RECIPIENT_NOT_FOUND' });
      }

      const recipientUserId = otherMember.user_id;
      let deliveredMessage = result.message;

      if (presenceService.isOnline(recipientUserId)) {
        const deliveryResult = await deliveryService.markMessageDelivered({
          messageId: result.message.id,
          recipientUserId
        });

        deliveredMessage = deliveryResult.message;
      }

      const response = {
        success: true,
        message: deliveredMessage,
        meta: {
          duplicate: result.isDuplicate,
          delivered: deliveredMessage.status !== 'SENT'
        }
      };

      if (!result.isDuplicate) {
        emitMessageAndStatus(io, recipientUserId, socket.data.user.id, deliveredMessage);
      }

      if (typeof ack === 'function') {
        ack(response);
      }
    } catch (error) {
      emitSocketError(socket, error, ack);
    }
  });
};

module.exports = {
  registerMessageHandlers,
  emitSocketError
};