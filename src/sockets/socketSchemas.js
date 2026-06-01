const { z } = require('zod');

const joinConversationSchema = z.object({
  conversationId: z.string().uuid()
});

const leaveConversationSchema = z.object({
  conversationId: z.string().uuid()
});

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(5000),
  clientMessageId: z.string().uuid()
});

const typingEventSchema = z.object({
  conversationId: z.string().uuid()
});

const deliveryEventSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid()
});

const readReceiptEventSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid().optional()
});

const conversationOpenedSchema = z.object({
  conversationId: z.string().uuid()
});

module.exports = {
  joinConversationSchema,
  leaveConversationSchema,
  sendMessageSchema,
  typingEventSchema,
  deliveryEventSchema,
  readReceiptEventSchema,
  conversationOpenedSchema
};