import { z } from 'zod';

/** An optional setting: unset and empty both mean absent, as `.env.example` leaves them empty. */
const optional = z
  .string()
  .optional()
  .transform((value) => value || undefined);

const envSchema = z
  .object({
    // Required, with no default: development's relaxations (the log email mode, cookies without
    // Secure, an optional Google client id) must never apply because the variable went missing.
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    // The one web origin allowed to call the API with credentials (docs/backend/security.md).
    CORS_ORIGIN: z.url(),
    // PostgreSQL connection string (docs/development/setup.md#database).
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    // Signs the access tokens (docs/backend/security.md › Tokens and cookies).
    JWT_SECRET: z.string().min(32),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    // Which proxies Express trusts for the client's address, which the per-IP rate limits count by
    // (docs/backend/security.md). Express's own syntax: a number of hops, or addresses and the names
    // loopback, linklocal and uniquelocal. Locally it defaults to loopback, the web's development
    // server; production must set it, since a wrong value merges or forges every client's address.
    TRUST_PROXY: optional.transform((value) =>
      value !== undefined && /^\d+$/.test(value) ? Number(value) : value,
    ),
    // Masaha's Google OAuth client id: the audience of Google sign-in. Without it, Google sign-in
    // answers service_unavailable; production requires it.
    GOOGLE_CLIENT_ID: optional,
    // The reset email (docs/backend/security.md › Passwords). `log` sends nothing and writes the
    // link to the log, so it is allowed in development only; `smtp` sends through the SMTP relay.
    EMAIL_MODE: z.enum(['log', 'smtp']).default('log'),
    SMTP_HOST: optional,
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
    // Implicit TLS (465); false is STARTTLS (587).
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    SMTP_USER: optional,
    SMTP_PASSWORD: optional,
    // The sender, e.g. "مساحة Masaha" <name@gmail.com>. Gmail requires the account's own address.
    EMAIL_FROM: optional,
  })
  .superRefine((env, context) => {
    for (const name of ['GOOGLE_CLIENT_ID', 'TRUST_PROXY'] as const) {
      if (env.NODE_ENV === 'production' && env[name] === undefined) {
        context.addIssue({ code: 'custom', path: [name], message: 'Required in production' });
      }
    }
    // A mode that sends nothing would report success while delivering nothing: only development
    // may use it, and production must deliver.
    if (env.EMAIL_MODE === 'log' && env.NODE_ENV !== 'development') {
      context.addIssue({
        code: 'custom',
        path: ['EMAIL_MODE'],
        message: 'log sends nothing and logs the link: development only. Use smtp',
      });
    }
  })
  // The email settings become one value whose type says what the mode needs, so no entry can wire
  // a mode without its settings.
  .transform(
    (
      {
        EMAIL_MODE,
        SMTP_HOST,
        SMTP_PORT,
        SMTP_SECURE,
        SMTP_USER,
        SMTP_PASSWORD,
        EMAIL_FROM,
        ...env
      },
      context,
    ) => {
      if (EMAIL_MODE === 'log') return { ...env, EMAIL: { mode: 'log' } as EmailSettings };
      const settings = {
        host: SMTP_HOST,
        user: SMTP_USER,
        password: SMTP_PASSWORD,
        from: EMAIL_FROM,
      };
      const missing = Object.entries({
        SMTP_HOST,
        SMTP_USER,
        SMTP_PASSWORD,
        EMAIL_FROM,
      }).filter(([, value]) => !value);
      for (const [name] of missing) {
        context.addIssue({
          code: 'custom',
          path: [name],
          message: 'Required with EMAIL_MODE=smtp',
        });
      }
      const { host, user, password, from } = settings;
      if (!host || !user || !password || !from) return z.NEVER;
      const email: EmailSettings = {
        mode: 'smtp',
        settings: { host, port: SMTP_PORT, secure: SMTP_SECURE, user, password, from },
      };
      return { ...env, EMAIL: email };
    },
  );

/** How the reset email goes out (docs/backend/security.md › Passwords). */
export type EmailSettings =
  | { mode: 'log' }
  | {
      mode: 'smtp';
      settings: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        password: string;
        from: string;
      };
    };

export type Env = z.infer<typeof envSchema>;

/** Which proxies to trust: as set, or loopback outside production (where it is required). */
export function trustProxyOf(env: Env): string | number {
  return env.TRUST_PROXY ?? 'loopback';
}

/** The session cookies are Secure everywhere but development (local HTTP). */
export function secureCookiesOf(env: Env): boolean {
  return env.NODE_ENV !== 'development';
}

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
