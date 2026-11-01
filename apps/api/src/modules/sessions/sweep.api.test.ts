import { beforeEach, describe, expect, it } from 'vitest';

import { createAccount, TEST_JWT_SECRET } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';
import { createSessionsService } from './sessions.service.ts';
import { successorKeyOf } from './tokens.ts';

const NOW = new Date('2026-10-29T10:00:00.000Z');
const sessions = createSessionsService({ successorKey: successorKeyOf(TEST_JWT_SECRET) });
const later = (ms: number) => new Date(NOW.getTime() + ms);

let userId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: userId } = await createAccount());
});

/** A refresh token of its own family, ending as given. */
async function refreshToken(hash: string, expiresAt: Date, sessionEndsAt: Date) {
  const row = await prisma.refreshToken.create({
    data: { userId, familyId: 0, tokenHash: hash, expiresAt, sessionEndsAt },
  });
  await prisma.refreshToken.update({ where: { id: row.id }, data: { familyId: row.id } });
}

const hashes = async (rows: Promise<{ tokenHash?: string; keyHash?: string }[]>) =>
  (await rows).map((row) => row.tokenHash ?? row.keyHash).sort();

describe('sessions: the sweep', () => {
  it('a sweep deletes expired refresh tokens and sessions past their end, keeping live ones', async () => {
    await refreshToken('expired', NOW, later(60_000));
    await refreshToken('session-ended', later(60_000), NOW);
    await refreshToken('live', later(1), later(1));

    const done = await sessions.sweepExpired(NOW);

    expect(done).toEqual({ refreshTokens: 2, resetTokens: 0, recoveries: 0 });
    expect(await hashes(prisma.refreshToken.findMany())).toEqual(['live']);
  });

  it('a sweep deletes expired reset tokens and recoveries', async () => {
    await prisma.passwordResetToken.createMany({
      data: [
        { userId, tokenHash: 'expired', expiresAt: NOW },
        { userId, tokenHash: 'live', expiresAt: later(1) },
      ],
    });
    const recovery = { maskedEmail: 's•••@example.com', sentAt: NOW };
    await prisma.passwordRecovery.createMany({
      data: [
        { ...recovery, keyHash: 'expired', expiresAt: NOW },
        { ...recovery, keyHash: 'live', expiresAt: later(1) },
      ],
    });

    const done = await sessions.sweepExpired(NOW);

    expect(done).toEqual({ refreshTokens: 0, resetTokens: 1, recoveries: 1 });
    expect(await hashes(prisma.passwordResetToken.findMany())).toEqual(['live']);
    expect(await hashes(prisma.passwordRecovery.findMany())).toEqual(['live']);
  });
});
