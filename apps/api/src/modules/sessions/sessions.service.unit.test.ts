import { describe, expect, it } from 'vitest';

import type { Tx } from '../../db/index.ts';
import type { SessionsRepository, StoredRefreshToken } from './sessions.repository.ts';
import { createSessionsService } from './sessions.service.ts';
import { hashToken } from './tokens.ts';

const NOW = new Date('2026-10-01T10:00:00Z');
const tx = {} as Tx;
const at = (ms: number) => new Date(NOW.getTime() + ms);

/** A repository holding one stored token, which records what the service asks of it. */
function fakeRepository(stored: StoredRefreshToken | null, { rotates = true } = {}) {
  const calls: string[] = [];
  const created: { expiresAt: Date; familyId?: number }[] = [];
  const repository = {
    findRefreshToken: () => Promise.resolve(stored),
    createRefreshToken: (token: { expiresAt: Date; familyId?: number }) => {
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
});

describe('sessions: rotation', () => {
  it('rotates a fresh token, marks it, and keeps its family', async () => {
    const { calls, created, repository } = fakeRepository(token(null));
    const sessions = createSessionsService({ repository, now: () => NOW });

    const rotation = await sessions.rotate('t', tx);

    expect(rotation.outcome).toBe('rotated');
    expect(calls).toEqual(['markRotated']);
    expect(created[0]?.familyId).toBe(1);
  });

  it('honours a token rotated 30,000 ms ago, and adds a sibling without marking it again', async () => {
    const { calls, repository } = fakeRepository(token(NOW));
    const sessions = createSessionsService({ repository, now: () => at(30_000) });

    expect((await sessions.rotate('t', tx)).outcome).toBe('rotated');
    expect(calls).toEqual([]);
  });

  it('ends the family of a token rotated 30,001 ms ago', async () => {
    const { calls, repository } = fakeRepository(token(NOW));
    const sessions = createSessionsService({ repository, now: () => at(30_001) });

    expect((await sessions.rotate('t', tx)).outcome).toBe('reused');
    expect(calls).toEqual(['deleteFamily:1']);
  });

  it('refuses an expired token, and refuses to go on when the rotation did not take', async () => {
    const expired = fakeRepository(token(null, NOW)).repository;
    const raced = fakeRepository(token(null), { rotates: false }).repository;

    expect(
      (await createSessionsService({ repository: expired, now: () => NOW }).rotate('t', tx))
        .outcome,
    ).toBe('invalid');
    await expect(
      createSessionsService({ repository: raced, now: () => NOW }).rotate('t', tx),
    ).rejects.toThrow(/session lock/);
  });
});

describe('sessions: lifetimes', () => {
  it('gives a refresh token 7 days and a reset token 1 hour', async () => {
    const { created, repository } = fakeRepository(token(null));
    const sessions = createSessionsService({ repository, now: () => NOW });

    const issued = await sessions.issue(3, tx);
    await sessions.issueResetToken(3);

    expect(created.map(({ expiresAt }) => expiresAt)).toEqual([
      at(7 * 24 * 60 * 60_000),
      at(60 * 60_000),
    ]);
    expect(issued.token).not.toBe(hashToken(issued.token));
  });
});
