import { describe, expect, it } from 'vitest';

import { adminRequest, signIn } from '../../../../test/admin.ts';
import { createTestApp } from '../../../../test/app.ts';
import { createArea, seedSettings } from '../../../../test/spaces.ts';

// Finding 11: inside an interactive transaction, a query sent while the client is still executing
// another makes `pg` 8 warn (and `pg` 9 refuse it). `pg` warns once per process, so this guard has a
// file of its own: the listener is attached before anything runs, and the space's creation below is
// the first in the process, the one the warning would come from.
const warnings: Error[] = [];
process.on('warning', (warning) => warnings.push(warning));

const app = createTestApp();

describe('the creation of a space', () => {
  it('emits no pg warning about a query sent while another runs', async () => {
    await seedSettings();
    const { id: areaId } = await createArea();

    const response = await adminRequest(app, await signIn('ADMIN'), 'post', '/spaces', {
      nameEn: 'Focus Hub',
      nameAr: 'فوكس',
      descriptionAr: 'هادئة',
      areaId,
      addressAr: 'شارع الشهداء',
      location: { lat: 31.52, lng: 34.45 },
    });

    expect(response.status).toBe(201);
    expect(warnings.filter(({ message }) => message.includes('already executing a query'))).toEqual(
      [],
    );
  });
});
