const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN
    }
  );
};

const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET);

module.exports = {
  generateAccessToken,
  verifyAccessToken
};
