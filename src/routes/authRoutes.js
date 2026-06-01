const express = require('express');
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { authMiddleware } = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../validators/authSchemas');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
