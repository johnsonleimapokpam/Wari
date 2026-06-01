const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(128),
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80)
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(128)
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

module.exports = {
  registerSchema,
  loginSchema
};
