import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // The one web origin allowed to call the API with credentials (docs/backend/security.md).
  CORS_ORIGIN: z.url(),
  // PostgreSQL connection string (docs/development/setup.md#database).
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Signs the access tokens (docs/backend/security.md › Tokens and cookies).
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Which proxies Express trusts for the client's address, which the per-IP rate limits count by
  // (docs/backend/security.md). Express's own syntax: a number of hops, or addresses and the names
  // loopback, linklocal and uniquelocal. Locally, the web's development server is on loopback.
  TRUST_PROXY: z
    .string()
    .default('loopback')
    .transform((value) => (/^\d+$/.test(value) ? Number(value) : value)),
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  override name = 'EnvError';
}

/** Validates the environment; throws an `EnvError` naming every missing or invalid variable. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const problems = result.error.issues.map(
    (issue) => `  ${issue.path.join('.')}: ${issue.message}`,
  );
  throw new EnvError(
    `Invalid environment. Set these variables (see apps/api/.env.example):\n${problems.join('\n')}`,
  );
}
