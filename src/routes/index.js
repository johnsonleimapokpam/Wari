const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const conversationRoutes = require('./conversationRoutes');
const groupsRoutes = require('./groupsRoutes');
const messageRoutes = require('./messageRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/conversations', conversationRoutes);
router.use('/groups', groupsRoutes);
router.use('/messages', messageRoutes);

module.exports = router;
