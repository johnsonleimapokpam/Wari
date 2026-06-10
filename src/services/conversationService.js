const ApiError = require('../utils/ApiError');
const conversationRepository = require('../repositories/conversationRepository');
const userRepository = require('../repositories/userRepository');

const buildDirectKey = (firstUserId, secondUserId) => {
  return [firstUserId, secondUserId].sort().join(':');
};

const createConversation = async ({ currentUserId, userId }) => {
  if (currentUserId === userId) {
    throw new ApiError(400, 'You cannot start a conversation with yourself', {
      code: 'INVALID_CONVERSATION_PARTICIPANT'
    });
  }

  const otherUser = await userRepository.findById(userId);

  if (!otherUser) {
    throw new ApiError(404, 'Target user not found', { code: 'USER_NOT_FOUND' });
  }

  const directKey = buildDirectKey(currentUserId, userId);
  const existingConversation = await conversationRepository.findDirectConversationByKey(directKey);

  if (existingConversation) {
    return conversationRepository.mapConversation(existingConversation);
  }

  try {
    const conversation = await conversationRepository.createDirectConversation({
      createdByUserId: currentUserId,
      directKey,
      memberIds: [currentUserId, userId]
    });

    return conversationRepository.mapConversation(conversation);
  } catch (error) {
    const conversation = await conversationRepository.findDirectConversationByKey(directKey);

    if (conversation) {
      return conversationRepository.mapConversation(conversation);
    }

    throw error;
  }
};

const getConversationList = async (userId) => {
  return conversationRepository.listConversationsForUser(userId);
};

const getConversation = async (conversationId) => {
  const conversation = await conversationRepository.findConversationById(conversationId);

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found', { code: 'CONVERSATION_NOT_FOUND' });
  }

  return conversationRepository.mapConversation(conversation);
};

const createDirectConversation =
  async (
    currentUserId,
    participantId
  ) => {

    return createConversation({
      currentUserId,
      userId: participantId
    });
};

module.exports = {
  createConversation,
  getConversationList,
  buildDirectKey,
  getConversation,
  createDirectConversation
};
