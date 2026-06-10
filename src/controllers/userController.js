const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const userService = require('../services/userService');
const presenceService = require('../services/presenceService');

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

const getUserPresence = asyncHandler(async (req, res) => {
  const presence = await presenceService.getPresence(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'User presence retrieved successfully',
    data: presence
  });
});

const searchUsers =
  async (req, res, next) => {

    try {

      const users =
        await userService.searchUsers(
          req.query.q,
          req.user.id
        );

      res.json({
        success: true,
        data: users
      });

    } catch (error) {
      next(error);
    }
};

module.exports = {
  getCurrentUser,
  updateProfile,
  getUserById,
  getUserPresence,
  searchUsers
};
