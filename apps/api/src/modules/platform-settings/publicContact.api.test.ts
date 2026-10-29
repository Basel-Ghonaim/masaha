import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { dataOf, errorOf } from '../../../test/admin.ts';
import { createTestApp } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';

// The platform's contact, as anyone reads it (docs/api/api-contract.md › Platform settings).
const app = createTestApp();
const contact = () => request(app).get('/api/v1/settings/public');

beforeEach(async () => {
  await resetDatabase(prisma);
});

describe('GET /settings/public', () => {
  it('anyone reads the contact, with Cache-Control public 5 minutes; none set: both null', async () => {
    const unset = await contact();
    expect(unset.status).toBe(200);
    expect(dataOf(unset)).toEqual({ email: null, whatsapp: null });
    expect(unset.headers['cache-control']).toBe('public, max-age=300');

    await prisma.setting.createMany({
      data: [
        { key: 'contactEmail', value: 'hello@masaha.ps' },
        { key: 'contactWhatsapp', value: '+970591234567' },
      ],
    });
    const set = await contact();
    expect(set.status).toBe(200);
    expect(dataOf(set)).toEqual({ email: 'hello@masaha.ps', whatsapp: '+970591234567' });
    expect(set.headers['cache-control']).toBe('public, max-age=300');
  });

  it('a stored contact that fails its schema is a 500, never answered', async () => {
    await prisma.setting.create({ data: { key: 'contactWhatsapp', value: '0591234567' } });

    const response = await contact();

    expect(response.status).toBe(500);
    expect(errorOf(response).type).toBe('server');
    expect(JSON.stringify(response.body)).not.toContain('0591234567');
  });
});
