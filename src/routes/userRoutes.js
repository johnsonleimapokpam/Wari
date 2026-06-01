const express = require('express');
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { updateProfileSchema, userIdParamSchema } = require('../validators/userSchemas');

const router = express.Router();

router.get('/me', authMiddleware, userController.getCurrentUser);
router.put('/me', authMiddleware, validate(updateProfileSchema), userController.updateProfile);
router.get('/:id', authMiddleware, validate(userIdParamSchema), userController.getUserById);

module.exports = router;
