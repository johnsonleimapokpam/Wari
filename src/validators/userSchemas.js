const { z } = require('zod');

const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().min(1).max(80).optional(),
    avatarUrl: z.string().url().max(2048).optional().nullable(),
    bio: z.string().max(500).optional().nullable()
  }).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

const userIdParamSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    id: z.string().uuid()
  }),
  query: z.object({}).passthrough()
});

module.exports = {
  updateProfileSchema,
  userIdParamSchema
};
