import { beforeEach, describe, expect, it } from 'vitest';

import {
  adminRequest,
  auditEntries,
  errorOf,
  REFUSED_CALLERS,
  signIn,
} from '../../../test/admin.ts';
import { createTestApp } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';

const app = createTestApp();

let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  admin = await signIn('ADMIN');
});

/** An account whose temporary password is still to be changed, unless told otherwise. */
function account(pending = true) {
  return prisma.user.create({
    data: {
      email: 'nour@example.com',
      name: 'Nour',
      role: 'OWNER',
      passwordHash: 'x',
      mustChangePassword: pending,
    },
  });
}

function handover(userId: number, body: object = { channel: 'WHATSAPP' }) {
  return adminRequest(
    app,
    admin,
    'post',
    `/users/${String(userId)}/temporary-password/handover`,
    body,
  );
}

describe('POST /admin/users/:userId/temporary-password/handover', () => {
  it.each(REFUSED_CALLERS)('refuses a $caller with $status', async ({ caller, ...refusal }) => {
    const { id } = await account();

    const response = await adminRequest(
      app,
      caller,
      'post',
      `/users/${String(id)}/temporary-password/handover`,
      { channel: 'WHATSAPP' },
    );

    expect(response.status).toBe(refusal.status);
    expect(errorOf(response).code).toBe(refusal.code);
    expect(await auditEntries()).toEqual([]);
  });

  it.each(['WHATSAPP', 'IN_PERSON', 'OTHER'])(
    'records a handover by %s in the audit, the account as its entity',
    async (channel) => {
      const { id } = await account();

      const response = await handover(id, { channel });

      expect(response.status).toBe(204);
      expect(await auditEntries()).toEqual([
        {
          actorId: admin.id,
          action: 'user.temporaryPasswordHandedOver',
          entityType: 'user',
          entityId: id,
          spaceId: null,
          before: null,
          after: { channel },
        },
      ]);
    },
  );

  it('refuses once the temporary password was changed: there is nothing to hand over', async () => {
    const { id } = await account(false);

    const response = await handover(id);

    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('TEMPORARY_PASSWORD_NOT_PENDING');
    expect(await auditEntries()).toEqual([]);
  });

  it('answers not_found for an unknown account', async () => {
    expect((await handover(999_999)).status).toBe(404);
  });

  it('refuses a channel it does not know', async () => {
    const { id } = await account();

    const response = await handover(id, { channel: 'EMAIL' });

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ channel: ['invalid_choice'] });
  });
});
