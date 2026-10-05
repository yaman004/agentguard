import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '../.env' });
dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be >= 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be >= 32 chars'),
  ACCESS_TTL_SECONDS: z.coerce.number().default(900),
  REFRESH_TTL_SECONDS: z.coerce.number().default(604800),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z.coerce.number().default(0),
  REDIS_URL: z.string().optional(),
  APPROVAL_TTL_HOURS: z.coerce.number().default(24),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
});

export const env = schema.parse(process.env);
export const isProd = env.NODE_ENV === 'production';
