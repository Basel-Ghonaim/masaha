import { describe, expect, it } from 'vitest';

import { prisma } from '../../db/index.ts';
import { createCounter } from './counter.ts';

const counter = createCounter(prisma);
const MINUTE = 60_000;

describe('createCounter', () => {
  it('counts hits in one window', async () => {
    const first = await counter.hit('k', MINUTE, new Date());
    const second = await counter.hit('k', MINUTE, new Date());

    expect(first.hits).toBe(1);
    expect(second).toEqual({ hits: 2, resetAt: first.resetAt });
    expect(first.resetAt.getTime() - Date.now()).toBeGreaterThan(50_000);
  });

  it('starts a new window once the last one ended, by the clock it is given', async () => {
    const start = new Date('2026-10-01T10:00:00Z');
    await counter.hit('k', MINUTE, start);
    await counter.hit('k', MINUTE, new Date(start.getTime() + MINUTE - 1));

    const next = await counter.hit('k', MINUTE, new Date(start.getTime() + MINUTE));

    expect(next).toEqual({ hits: 1, resetAt: new Date(start.getTime() + 2 * MINUTE) });
  });

  it('counts concurrent hits once each', async () => {
    const counts = await Promise.all(
      Array.from({ length: 20 }, () => counter.hit('k', MINUTE, new Date())),
    );

    expect(counts.map(({ hits }) => hits).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
  });

  it('gives a hit back within its own window only', async () => {
    const first = await counter.hit('k', MINUTE, new Date());
    await counter.hit('k', MINUTE, new Date());

    await counter.refund('k', first);
    expect((await prisma.rateLimit.findUniqueOrThrow({ where: { key: 'k' } })).hits).toBe(1);

    await counter.refund('k', { hits: 1, resetAt: new Date(first.resetAt.getTime() + 1) });
    expect((await prisma.rateLimit.findUniqueOrThrow({ where: { key: 'k' } })).hits).toBe(1);
  });

  it('never gives back below zero', async () => {
    const first = await counter.hit('k', MINUTE, new Date());

    await counter.refund('k', first);
    await counter.refund('k', first);

    expect((await prisma.rateLimit.findUniqueOrThrow({ where: { key: 'k' } })).hits).toBe(0);
  });
});
