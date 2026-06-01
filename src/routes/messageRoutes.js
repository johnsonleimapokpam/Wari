const express = require('express');
const messageController = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { sendMessageSchema, messageHistorySchema } = require('../validators/messageSchemas');

const router = express.Router();

router.post('/', authMiddleware, validate(sendMessageSchema), messageController.sendMessage);
router.get('/:conversationId', authMiddleware, validate(messageHistorySchema), messageController.getMessageHistory);

module.exports = router;
