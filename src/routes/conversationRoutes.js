const express = require('express');
const conversationController = require('../controllers/conversationController');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createConversationSchema } = require('../validators/conversationSchemas');

const router = express.Router();

router.post('/', authMiddleware, validate(createConversationSchema), conversationController.createConversation);
router.get('/', authMiddleware, conversationController.getConversationList);

module.exports = router;
