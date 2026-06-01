const { verifyAccessToken } = require('../utils/jwt');

const getSocketToken = (socket) => {
  const authToken = socket.handshake.auth && socket.handshake.auth.token;

  if (authToken) {
    return authToken;
  }

  const authorizationHeader = socket.handshake.headers.authorization;

  if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
    return authorizationHeader.slice(7);
  }

  return null;
};

const socketAuth = (socket, next) => {
  const token = getSocketToken(socket);

  if (!token) {
    return next(new Error('Unauthorized socket connection'));
  }

  try {
    const payload = verifyAccessToken(token);

    socket.data.user = {
      id: payload.sub,
      email: payload.email
    };
    socket.data.joinedConversationIds = new Set();

    return next();
  } catch (_error) {
    return next(new Error('Unauthorized socket connection'));
  }
};

module.exports = {
  socketAuth,
  getSocketToken
};