const { z } = require('zod');

const createConversationSchema = z.object({
  body: z.object({
    userId: z.string().uuid()
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

module.exports = {
  createConversationSchema
};
