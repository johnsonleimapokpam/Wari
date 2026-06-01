const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const userService = require('../services/userService');

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await userService.getCurrentUser(req.user.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Current user retrieved successfully',
    data: user
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Profile updated successfully',
    data: user
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'User retrieved successfully',
    data: user
  });
});

module.exports = {
  getCurrentUser,
  updateProfile,
  getUserById
};
