const presenceService = require('../services/presenceService');
const ApiError = require('../utils/ApiError');

const emitPresenceError = (socket, ack, error) => {
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

const emitPresenceSnapshot = (io, userId, snapshot, statusChanged) => {
  if (statusChanged === 'online') {
    io.emit('user_online', snapshot);
    io.emit('presence_updated', snapshot);
  }

  if (statusChanged === 'offline') {
    io.emit('user_offline', snapshot);
    io.emit('presence_updated', snapshot);
  }
};

const registerPresenceHandlers = (socket, io) => {
  socket.on('user_connected', async (_payload, ack) => {
    try {
      const result = await presenceService.registerConnection({
        userId: socket.data.user.id,
        socketId: socket.id
      });

      emitPresenceSnapshot(io, socket.data.user.id, result.snapshot, result.isNewOnlineTransition ? 'online' : null);

      if (typeof ack === 'function') {
        ack({
          success: true,
          data: result.snapshot
        });
      }
    } catch (error) {
      emitPresenceError(socket, ack, error);
    }
  });

  socket.on('heartbeat', async (_payload, ack) => {
    try {
      const result = await presenceService.recordHeartbeat({
        userId: socket.data.user.id,
        socketId: socket.id
      });

      io.to(`user:${socket.data.user.id}`).emit('presence_updated', result.snapshot);

      if (typeof ack === 'function') {
        ack({
          success: true,
          data: result.snapshot
        });
      }
    } catch (error) {
      emitPresenceError(socket, ack, error);
    }
  });

  socket.on('disconnect', async () => {
    try {
      const result = await presenceService.unregisterConnection({
        userId: socket.data.user.id,
        socketId: socket.id
      });

      if (result.wentOffline) {
        emitPresenceSnapshot(io, socket.data.user.id, result.snapshot, 'offline');
      } else if (result.snapshot) {
        io.to(`user:${socket.data.user.id}`).emit('presence_updated', result.snapshot);
      }
    } catch (error) {
      console.error('Presence disconnect handling failed', error);
    }
  });
};

module.exports = {
  registerPresenceHandlers
};