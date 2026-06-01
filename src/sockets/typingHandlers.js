const ApiError = require('../utils/ApiError');
const conversationRepository = require('../repositories/conversationRepository');
const typingService = require('../services/typingService');
const { typingEventSchema } = require('./socketSchemas');
const { groupRoomNameForConversation, resolveConversationRoomName, serializeSocketUser } = require('./roomHandlers');

const validatePayload = (payload) => {
  const result = typingEventSchema.safeParse(payload);

  if (!result.success) {
    throw new ApiError(400, 'Invalid socket payload', {
      code: 'SOCKET_VALIDATION_ERROR',
      details: result.error.errors
    });
  }

  return result.data;
};

const emitTypingError = (socket, ack, error) => {
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

const broadcastTypingStart = (socket, io, conversationId) => {
  const roomName = socket.data.typingRoomName || groupRoomNameForConversation(conversationId);

  socket.to(roomName).emit('user_typing', {
    conversationId,
    user: serializeSocketUser(socket)
  });
};

const broadcastTypingStop = (socket, io, conversationId) => {
  const roomName = socket.data.typingRoomName || groupRoomNameForConversation(conversationId);

  socket.to(roomName).emit('user_stopped_typing', {
    conversationId,
    user: serializeSocketUser(socket)
  });
};

const ensureConversationAccess = async (socket, conversationId) => {
  const membership = await conversationRepository.findConversationMember(conversationId, socket.data.user.id);

  if (!membership) {
    throw new ApiError(403, 'You are not a member of this conversation', {
      code: 'NOT_A_CONVERSATION_MEMBER'
    });
  }

  const roomName = await resolveConversationRoomName(conversationId);
  socket.data.typingRoomName = roomName;

  if (!socket.data.joinedConversationIds.has(roomName)) {
    throw new ApiError(403, 'You must join the conversation before sending typing events', {
      code: 'NOT_JOINED_CONVERSATION_ROOM'
    });
  }
};

const registerTypingHandlers = (socket, io) => {
  socket.on('typing_start', async (payload, ack) => {
    try {
      const { conversationId } = validatePayload(payload);
      await ensureConversationAccess(socket, conversationId);

      const result = typingService.startTyping({
        conversationId,
        userId: socket.data.user.id,
        socketId: socket.id,
        timeoutMs: 3000,
        onTimeout: ({ snapshot }) => {
          if (snapshot.activeTypingUsersCount === 0) {
            broadcastTypingStop(socket, io, conversationId);
          }
        }
      });

      if (result.startedTyping) {
        broadcastTypingStart(socket, io, conversationId);
      }

      if (typeof ack === 'function') {
        ack({
          success: true,
          data: result.snapshot,
          meta: {
            startedTyping: result.startedTyping,
            alreadyTyping: result.alreadyTyping
          }
        });
      }
    } catch (error) {
      emitTypingError(socket, ack, error);
    }
  });

  socket.on('typing_stop', async (payload, ack) => {
    try {
      const { conversationId } = validatePayload(payload);
      await ensureConversationAccess(socket, conversationId);

      const result = typingService.stopTyping({
        conversationId,
        userId: socket.data.user.id,
        socketId: socket.id,
        occurredAt: new Date(),
        reason: 'manual'
      });

      if (result.stoppedTyping) {
        broadcastTypingStop(socket, io, conversationId);
      }

      if (typeof ack === 'function') {
        ack({
          success: true,
          data: result.snapshot,
          meta: {
            stoppedTyping: result.stoppedTyping
          }
        });
      }
    } catch (error) {
      emitTypingError(socket, ack, error);
    }
  });

  socket.on('disconnect', () => {
    const stoppedConversations = typingService.clearSocket(socket.id);

    for (const { conversationId } of stoppedConversations) {
      broadcastTypingStop(socket, io, conversationId);
    }
  });
};

module.exports = {
  registerTypingHandlers
};