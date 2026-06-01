const bcrypt = require('bcryptjs');
const ApiError = require('../utils/ApiError');
const { env } = require('../config/env');
const { generateAccessToken } = require('../utils/jwt');
const userRepository = require('../repositories/userRepository');

const buildAuthPayload = (user) => ({
  user,
  accessToken: generateAccessToken(user)
});

const register = async ({ email, password, firstName, lastName }) => {
  const existingUser = await userRepository.findAuthRecordByEmail(email);

  if (existingUser) {
    throw new ApiError(409, 'Email is already in use', {
      code: 'EMAIL_ALREADY_EXISTS'
    });
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
  const user = await userRepository.createUser({
    email,
    passwordHash,
    firstName,
    lastName
  });

  return buildAuthPayload(user);
};

const login = async ({ email, password }) => {
  const authRecord = await userRepository.findAuthRecordByEmail(email);

  if (!authRecord) {
    throw new ApiError(401, 'Invalid email or password', {
      code: 'INVALID_CREDENTIALS'
    });
  }

  const passwordMatches = await bcrypt.compare(password, authRecord.password_hash);

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password', {
      code: 'INVALID_CREDENTIALS'
    });
  }

  const user = await userRepository.findById(authRecord.id);

  return buildAuthPayload(user);
};

module.exports = {
  register,
  login
};
