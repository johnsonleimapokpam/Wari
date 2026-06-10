const messageService = require('../services/messageService');
const deliveryService = require('../services/deliveryService');
const ApiError = require('../utils/ApiError');
const { sendMessageSchema } = require('./socketSchemas');
const { resolveConversationRoomName, serializeSocketUser } = require('./roomHandlers');
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

const emitMessageAndStatus = (
  io,
  recipientUserId,
  senderUserId,
  message
) => {

  const payload = {
    message,
    conversationId:
      message.conversationId,
    sender: {
      id: senderUserId
    }
  };

  io.to(
    `user:${recipientUserId}`
  ).emit(
    'message_received',
    payload
  );

  io.to(
    `user:${senderUserId}`
  ).emit(
    'message_received',
    payload
  );

  io.to(
    `user:${senderUserId}`
  ).emit(
    'message_status_updated',
    {
      conversationId:
        message.conversationId,
      messageId:
        message.id,
      status:
        message.status,
      deliveredAt:
        message.deliveredAt,
      readAt:
        message.readAt,
      senderId:
        senderUserId,
      recipientId:
        recipientUserId
    }
  );
};

const registerMessageHandlers = (socket, io) => {
  socket.on('send_message', async (payload, ack) => {
    try {
      const data = validatePayload(payload);
      const conversation = await conversationRepository.findConversationById(data.conversationId);

      if (!conversation) {
        throw new ApiError(404, 'Conversation not found', { code: 'CONVERSATION_NOT_FOUND' });
      }

      const roomName = await resolveConversationRoomName(data.conversationId);

      if (!socket.data.joinedConversationIds.has(roomName)) {
        throw new ApiError(403, 'You must join the conversation before sending messages', {
          code: 'NOT_JOINED_CONVERSATION_ROOM'
        });
      }

      const result = await messageService.sendMessage({
        conversationId: data.conversationId,
        senderId: socket.data.user.id,
        body: data.body,
        clientMessageId: data.clientMessageId
      });

      if (result.conversationType === 'group') {
          if (!result.isDuplicate) {
            io.to(roomName).emit('message_received', {
              message: result.message,
              conversationId: data.conversationId,
              sender: serializeSocketUser(socket)
            });

            io.to(`user:${socket.data.user.id}`).emit('message_status_updated', {
              conversationId: data.conversationId,
              messageId: result.message.id,
              status: result.message.status,
              deliveredCount: result.delivery.deliveredCount,
              recipientCount: result.delivery.recipientCount,
              senderId: socket.data.user.id
            });
          }

        if (typeof ack === 'function') {
          ack({
            success: true,
            message: result.message,
            meta: {
              duplicate: result.isDuplicate,
              delivered: result.delivery.deliveredCount > 0,
              recipientCount: result.delivery.recipientCount,
              deliveredCount: result.delivery.deliveredCount
            }
          });
        }

        return;
      }

      const otherMember = await conversationRepository.findOtherConversationMemberUserId(data.conversationId, socket.data.user.id);

      if (!otherMember) {
        throw new ApiError(403, 'Conversation recipient not found', { code: 'RECIPIENT_NOT_FOUND' });
      }

      const recipientUserId = otherMember.user_id;
      let deliveredMessage = result.message;

      if ( await presenceService.getPresence(recipientUserId)) {
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