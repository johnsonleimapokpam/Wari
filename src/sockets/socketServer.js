const { Server } = require('socket.io');
const { env } = require('../config/env');
const { socketAuth } = require('./socketAuth');
const { registerMessageHandlers } = require('./messageHandlers');
const { registerRoomHandlers } = require('./roomHandlers');
const { registerPresenceHandlers } = require('./presenceHandlers');

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

    registerRoomHandlers(socket, io, state);
    registerMessageHandlers(socket, io, state);
    registerPresenceHandlers(socket, io);
  });

  return io;
};

module.exports = {
  initializeSocketServer
};