import { passwordSchema } from '@masaha/shared';
import { z } from 'zod';

import { createPrismaClient } from '../prisma.ts';
import { seed } from './seed.ts';

// `npm run db:seed`: seeds the database at DATABASE_URL from the environment (apps/api/.env). The
// admin's credentials and the platform contact live only there, never in the repository.

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  SEED_ADMIN_EMAIL: z.email(),
  SEED_ADMIN_PASSWORD: passwordSchema,
  SEED_ADMIN_NAME: optional(z.string().trim().min(1)),
  SEED_CONTACT_EMAIL: optional(z.email()),
  SEED_CONTACT_WHATSAPP: optional(z.string().regex(/^\+[1-9][0-9]{7,14}$/)),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map(
    (issue) => `  ${issue.path.join('.')}: ${issue.message}`,
  );
  console.error(
    `Cannot seed. Set these variables (see apps/api/.env.example):\n${problems.join('\n')}`,
  );
  process.exit(1);
}
const env = parsed.data;

const db = createPrismaClient(env.DATABASE_URL);
try {
  await seed(db, {
    admin: {
      email: env.SEED_ADMIN_EMAIL,
      password: env.SEED_ADMIN_PASSWORD,
      name: env.SEED_ADMIN_NAME ?? 'Admin',
    },
    contact: { email: env.SEED_CONTACT_EMAIL, whatsapp: env.SEED_CONTACT_WHATSAPP },
  });
  console.log('Seeded the lookups, the admin account and the settings.');
} finally {
  await db.$disconnect();
}
