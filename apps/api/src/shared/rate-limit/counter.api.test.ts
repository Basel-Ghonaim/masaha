import { describe, expect, it } from 'vitest';

import { prisma } from '../../db/index.ts';
import { createCounter } from './counter.ts';

const counter = createCounter(prisma);
const MINUTE = 60_000;

describe('createCounter', () => {
  it('counts hits in one window', async () => {
    const first = await counter.hit('k', MINUTE);
    const second = await counter.hit('k', MINUTE);

    expect(first.hits).toBe(1);
    expect(second).toEqual({ hits: 2, resetAt: first.resetAt });
    expect(first.resetAt.getTime() - Date.now()).toBeGreaterThan(50_000);
  });

  it('starts a new window once the last one ended', async () => {
    await counter.hit('k', MINUTE);
    await prisma.rateLimit.update({
      where: { key: 'k' },
      data: { hits: 7, resetAt: new Date(Date.now() - 1_000) },
    });

    expect((await counter.hit('k', MINUTE)).hits).toBe(1);
  });

  it('counts concurrent hits once each', async () => {
    const counts = await Promise.all(Array.from({ length: 20 }, () => counter.hit('k', MINUTE)));

    expect(counts.map(({ hits }) => hits).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
  });

  it('gives a hit back within its own window only', async () => {
    const first = await counter.hit('k', MINUTE);
    await counter.hit('k', MINUTE);

    await counter.refund('k', first);
    expect((await prisma.rateLimit.findUniqueOrThrow({ where: { key: 'k' } })).hits).toBe(1);

    await counter.refund('k', { hits: 1, resetAt: new Date(first.resetAt.getTime() + 1) });
    expect((await prisma.rateLimit.findUniqueOrThrow({ where: { key: 'k' } })).hits).toBe(1);
  });

  it('never gives back below zero', async () => {
    const first = await counter.hit('k', MINUTE);

    await counter.refund('k', first);
    await counter.refund('k', first);

    expect((await prisma.rateLimit.findUniqueOrThrow({ where: { key: 'k' } })).hits).toBe(0);
  });
});
