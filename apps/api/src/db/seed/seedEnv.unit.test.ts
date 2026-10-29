import { describe, expect, it } from 'vitest';

import { seedEnvSchema } from './seedEnv.ts';

const valid = {
  DATABASE_URL: 'postgresql://masaha:masaha@localhost:5433/masaha_dev',
  SEED_ADMIN_EMAIL: 'admin@example.com',
  SEED_ADMIN_PASSWORD: 'change-me-1',
};

describe('seedEnvSchema', () => {
  it('stores the contact normalised: the WhatsApp in its one E.164 form, the email lowercased', () => {
    const env = seedEnvSchema.parse({
      ...valid,
      SEED_CONTACT_EMAIL: ' Hello@Masaha.PS',
      SEED_CONTACT_WHATSAPP: '+972591234567',
    });

    expect(env.SEED_CONTACT_EMAIL).toBe('hello@masaha.ps');
    expect(env.SEED_CONTACT_WHATSAPP).toBe('+970591234567');
  });

  it('leaves an empty or missing contact unset', () => {
    const env = seedEnvSchema.parse({ ...valid, SEED_CONTACT_EMAIL: '' });

    expect(env.SEED_CONTACT_EMAIL).toBeUndefined();
    expect(env.SEED_CONTACT_WHATSAPP).toBeUndefined();
  });

  it('a foreign WhatsApp fails the seed, naming its variable', () => {
    const parsed = seedEnvSchema.safeParse({ ...valid, SEED_CONTACT_WHATSAPP: '+201001234567' });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path.join('.'))).toEqual([
      'SEED_CONTACT_WHATSAPP',
    ]);
  });
});
