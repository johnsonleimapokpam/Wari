const messageService = require('../services/messageService');
const ApiError = require('../utils/ApiError');
const { sendMessageSchema } = require('./socketSchemas');
const { roomNameForConversation, serializeSocketUser } = require('./roomHandlers');

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

const registerMessageHandlers = (socket, io) => {
  socket.on('send_message', async (payload, ack) => {
    try {
      const data = validatePayload(payload);
      const roomName = roomNameForConversation(data.conversationId);

      const result = await messageService.sendMessage({
        conversationId: data.conversationId,
        senderId: socket.data.user.id,
        body: data.body,
        clientMessageId: data.clientMessageId
      });

      const response = {
        success: true,
        message: result.message,
        meta: {
          duplicate: result.isDuplicate
        }
      };

      if (!result.isDuplicate) {
        io.to(roomName).emit('message_received', {
          message: result.message,
          conversationId: data.conversationId,
          sender: serializeSocketUser(socket)
        });
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