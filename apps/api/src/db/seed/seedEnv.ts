import { emailSchema, phoneSchema } from '@masaha/shared/core';
import { passwordSchema } from '@masaha/shared/users';
import { z } from 'zod';

// The seed's environment (apps/api/.env), checked before anything is written; run.ts reads it. The
// contact goes through the admin's own schemas, so it is stored in its one form (finding 153).

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

export const seedEnvSchema = z
  .object({
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    SEED_ADMIN_EMAIL: z.email(),
    SEED_ADMIN_PASSWORD: passwordSchema,
    SEED_ADMIN_NAME: optional(z.string().trim().min(1)),
    SEED_CONTACT_EMAIL: optional(emailSchema),
    SEED_CONTACT_WHATSAPP: optional(phoneSchema),
    SEED_DEMO: optional(z.stringbool()),
    SEED_DEMO_PASSWORD: optional(passwordSchema),
  })
  .refine((env) => !env.SEED_DEMO || env.SEED_DEMO_PASSWORD, {
    path: ['SEED_DEMO_PASSWORD'],
    message: 'required when SEED_DEMO is true',
  });
