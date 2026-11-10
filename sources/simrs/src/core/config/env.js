import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DB_URI: z.string().min(1, { message: 'DB_URI wajib didefinisikan' }),
  DB_DIALECT: z.enum(['postgres', 'mysql']).optional(),
  DB_SSL: z.enum(['true', 'false']).default('false'),
  DB_POOL_MAX: z.string().transform(Number).default('20'),
  DB_POOL_MIN: z.string().transform(Number).default('5'),
  SHUTDOWN_TIMEOUT_MS: z.string().transform(Number).default('25000'),
  INTERNAL_SERVICE_SECRET: z.string().default('default_internal_secret'),
  BILLING_SERVICE_URL: z.string().url().optional()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success && process.env.NODE_ENV !== 'test') {
  console.error('❌ Konfigurasi Environment tidak valid:', parsedEnv.error.format());
}

export const env = parsedEnv.success ? parsedEnv.data : process.env;

