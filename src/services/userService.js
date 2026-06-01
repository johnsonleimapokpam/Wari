const ApiError = require('../utils/ApiError');
const userRepository = require('../repositories/userRepository');

const getCurrentUser = async (userId) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found', { code: 'USER_NOT_FOUND' });
  }

  return user;
};

const updateProfile = async (userId, updates) => {
  const user = await userRepository.updateProfile(userId, updates);

  if (!user) {
    throw new ApiError(404, 'User not found', { code: 'USER_NOT_FOUND' });
  }

  return user;
};

const getUserById = async (userId) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found', { code: 'USER_NOT_FOUND' });
  }

  return user;
};

module.exports = {
  getCurrentUser,
  updateProfile,
  getUserById
};
