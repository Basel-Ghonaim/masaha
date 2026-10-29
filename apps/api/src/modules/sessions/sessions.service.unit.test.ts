import { describe, expect, it } from 'vitest';

import type { Tx } from '../../db/index.ts';
import type {
  SessionsRepository,
  StoredRecovery,
  StoredRefreshToken,
} from './sessions.repository.ts';
import { createSessionsService } from './sessions.service.ts';
import { hashToken, successorKeyOf, successorOf } from './tokens.ts';

const NOW = new Date('2026-10-01T10:00:00Z');
const tx = {} as Tx;
const at = (ms: number) => new Date(NOW.getTime() + ms);
const KEY = successorKeyOf('a-test-secret-of-at-least-32-characters');

/**
 * A repository holding one stored token, `t`, and its successor while `successor` holds, which
 * records what the service asks of it.
 */
function fakeRepository(
  stored: StoredRefreshToken | null,
  { rotates = true, successor = true } = {},
) {
  const calls: string[] = [];
  const created: { expiresAt: Date; familyId?: number; tokenHash?: string }[] = [];
  const repository = {
    findRefreshToken: (tokenHash: string) => {
      if (tokenHash === hashToken('t')) return Promise.resolve(stored);
      const found = successor && tokenHash === hashToken(successorOf('t', KEY));
      return Promise.resolve(found && stored ? { ...stored, id: 2, rotatedAt: null } : null);
    },
    familyActivity: () => Promise.resolve(stored?.lastActivityAt),
    createRefreshToken: (token: { expiresAt: Date; familyId?: number; tokenHash?: string }) => {
      created.push(token);
      return Promise.resolve({ ...stored, id: 2, familyId: token.familyId ?? 2 });
    },
    markRotated: () => {
      calls.push('markRotated');
      return Promise.resolve(rotates);
    },
    deleteFamily: (familyId: number) => {
      calls.push(`deleteFamily:${String(familyId)}`);
      return Promise.resolve();
    },
    deleteExpired: () => Promise.resolve(),
    createResetToken: (_userId: number, _hash: string, expiresAt: Date) => {
      created.push({ expiresAt });
      return Promise.resolve(7);
    },
  } as unknown as SessionsRepository;
  return { calls, created, repository };
}

const token = (rotatedAt: Date | null, expiresAt = at(60 * 60_000)): StoredRefreshToken => ({
  id: 1,
  userId: 3,
  familyId: 1,
  expiresAt,
  rotatedAt,
  sessionEndsAt: at(30 * 24 * 60 * 60_000),
  lastActivityAt: NOW,
});

describe('sessions: rotation', () => {
  it('rotates a fresh token to its successor, marks it, and keeps its family', async () => {
    const { calls, created, repository } = fakeRepository(token(null));
    const sessions = createSessionsService({ successorKey: KEY, repository, now: () => NOW });

    const rotation = await sessions.rotate('t', tx);

    expect(rotation).toEqual({
      outcome: 'rotated',
      issued: { token: successorOf('t', KEY), familyId: 1 },
    });
    expect(calls).toEqual(['markRotated']);
    expect(created[0]?.familyId).toBe(1);
    expect(created[0]?.tokenHash).toBe(hashToken(successorOf('t', KEY)));
  });

  it('answers a token rotated 30,000 ms ago with its successor, adding nothing', async () => {
    const { calls, created, repository } = fakeRepository(token(NOW));
    const sessions = createSessionsService({
      successorKey: KEY,
      repository,
      now: () => at(30_000),
    });

    expect(await sessions.rotate('t', tx)).toEqual({
      outcome: 'rotated',
      issued: { token: successorOf('t', KEY), familyId: 1 },
    });
    expect(calls).toEqual([]);
    expect(created).toEqual([]);
  });

  it('refuses a token within the grace whose successor has ended', async () => {
    const { repository } = fakeRepository(token(NOW), { successor: false });
    const sessions = createSessionsService({
      successorKey: KEY,
      repository,
      now: () => at(1_000),
    });

    expect((await sessions.rotate('t', tx)).outcome).toBe('invalid');
  });

  it('ends the family of a token rotated 30,001 ms ago', async () => {
    const { calls, repository } = fakeRepository(token(NOW));
    const sessions = createSessionsService({
      successorKey: KEY,
      repository,
      now: () => at(30_001),
    });

    expect((await sessions.rotate('t', tx)).outcome).toBe('reused');
    expect(calls).toEqual(['deleteFamily:1']);
  });

  it('refuses an expired token, and refuses to go on when the rotation did not take', async () => {
    const expired = fakeRepository(token(null, NOW)).repository;
    const raced = fakeRepository(token(null), { rotates: false }).repository;

    expect(
      (
        await createSessionsService({
          successorKey: KEY,
          repository: expired,
          now: () => NOW,
        }).rotate('t', tx)
      ).outcome,
    ).toBe('invalid');
    await expect(
      createSessionsService({ successorKey: KEY, repository: raced, now: () => NOW }).rotate(
        't',
        tx,
      ),
    ).rejects.toThrow(/session lock/);
  });
});

describe('sessions: lifetimes', () => {
  it('gives a refresh token 7 days and a reset token 1 hour', async () => {
    const { created, repository } = fakeRepository(token(null));
    const sessions = createSessionsService({ successorKey: KEY, repository, now: () => NOW });

    const issued = await sessions.issue(3, tx);
    await sessions.issueResetToken(3);

    expect(created.map(({ expiresAt }) => expiresAt)).toEqual([
      at(7 * 24 * 60 * 60_000),
      at(60 * 60_000),
    ]);
    expect(issued.token).not.toBe(hashToken(issued.token));
  });
});

describe('sessions: recoveries', () => {
  const stored = (changes: Partial<StoredRecovery> = {}): StoredRecovery => ({
    id: 5,
    userId: 3,
    maskedEmail: 's•••@example.com',
    emailDigest: 'digest',
    resetTokenId: null,
    resends: 0,
    sentAt: NOW,
    expiresAt: at(60 * 60_000),
    ...changes,
  });

  /** A repository holding one recovery, as the database would answer for it. */
  function recoveryRepository(recovery: StoredRecovery) {
    return {
      createRecovery: (data: { sentAt: Date; expiresAt: Date }) =>
        Promise.resolve({ ...recovery, ...data }),
      findRecovery: () => Promise.resolve(recovery),
      deleteRecovery: () => Promise.resolve(),
    } as unknown as SessionsRepository;
  }

  it('opens a recovery that lasts 1 hour and may ask again in 60 seconds', async () => {
    const sessions = createSessionsService({
      successorKey: KEY,
      repository: recoveryRepository(stored()),
      now: () => NOW,
    });

    const { key, recovery } = await sessions.openRecovery({
      maskedEmail: 's•••@example.com',
      emailDigest: 'digest',
    });

    expect(recovery).toMatchObject({
      resendInSeconds: 60,
      canResend: true,
      remainingMs: 3_600_000,
    });
    expect(key).not.toBe(hashToken(key));
  });

  it('counts the window down to 0 after 60 seconds', async () => {
    const repository = recoveryRepository(stored());

    const early = await createSessionsService({
      successorKey: KEY,
      repository,
      now: () => at(59_001),
    }).recovery('k');
    const late = await createSessionsService({
      successorKey: KEY,
      repository,
      now: () => at(60_000),
    }).recovery('k');

    expect(early?.resendInSeconds).toBe(1);
    expect(late?.resendInSeconds).toBe(0);
  });

  it('may not ask again after 3 asks, nor once a link was checked', async () => {
    const spent = recoveryRepository(stored({ resends: 3 }));
    const checked = recoveryRepository(stored({ resetTokenId: 9 }));

    const afterThree = await createSessionsService({
      successorKey: KEY,
      repository: spent,
      now: () => NOW,
    }).recovery('k');
    const afterCheck = await createSessionsService({
      successorKey: KEY,
      repository: checked,
      now: () => NOW,
    }).recovery('k');

    expect(afterThree).toMatchObject({ canResend: false, linkChecked: false });
    expect(afterCheck).toMatchObject({ canResend: false, linkChecked: true });
  });

  it('reads no recovery without a key', async () => {
    const sessions = createSessionsService({
      successorKey: KEY,
      repository: recoveryRepository(stored()),
      now: () => NOW,
    });

    expect(await sessions.recovery(undefined)).toBeUndefined();
  });
});
