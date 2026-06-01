const { Server } = require('socket.io');
const { env } = require('../config/env');
const { socketAuth } = require('./socketAuth');
const { registerMessageHandlers } = require('./messageHandlers');
const { registerRoomHandlers } = require('./roomHandlers');
const { registerPresenceHandlers } = require('./presenceHandlers');
const { registerTypingHandlers } = require('./typingHandlers');
const { registerDeliveryHandlers } = require('./deliveryHandlers');
const { registerReadReceiptHandlers } = require('./readReceiptHandlers');

const createSocketState = () => ({
  roomPresence: new Map()
});

const initializeSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) : true,
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  const state = createSocketState();

  io.use(socketAuth);

  io.on('connection', (socket) => {
    const userRoom = `user:${socket.data.user.id}`;

    socket.join(userRoom);

    registerPresenceHandlers(socket, io);
    registerTypingHandlers(socket, io);
    registerDeliveryHandlers(socket, io);
    registerReadReceiptHandlers(socket, io);
    registerMessageHandlers(socket, io, state);
    registerRoomHandlers(socket, io, state);
  });

  return io;
};

module.exports = {
  initializeSocketServer
};