import { describe, expect, it } from 'vitest';

import { ALLOCATION_MAX_ITEMS, allocate } from './allocation.ts';

const visit = (visitId: number) => ({ visitId });
const subscription = (subscriptionId: number) => ({ subscriptionId });
const NEW = subscription(9);

describe('allocate', () => {
  it('oldest first, each at most its balance, the rest to the new one', () => {
    const debts = [
      { item: visit(1), balanceAgorot: 1_500 },
      { item: subscription(2), balanceAgorot: 5_000 },
    ];
    expect(allocate(10_000, debts, NEW)).toEqual({
      parts: [
        { item: visit(1), amountAgorot: 1_500 },
        { item: subscription(2), amountAgorot: 5_000 },
        { item: NEW, amountAgorot: 3_500 },
      ],
    });
    // Short of the debts: the oldest paid first, nothing left for the new one.
    expect(allocate(4_000, debts, NEW)).toEqual({
      parts: [
        { item: visit(1), amountAgorot: 1_500 },
        { item: subscription(2), amountAgorot: 2_500 },
      ],
    });
  });

  it('an amount below the first debt pays only it; nothing owed → all to the new one', () => {
    const debts = [
      { item: visit(1), balanceAgorot: 1_500 },
      { item: visit(2), balanceAgorot: 800 },
    ];
    expect(allocate(1_000, debts, NEW)).toEqual({
      parts: [{ item: visit(1), amountAgorot: 1_000 }],
    });
    expect(allocate(7_000, [], NEW)).toEqual({ parts: [{ item: NEW, amountAgorot: 7_000 }] });
  });

  it('50 items at most: the 49 oldest debts, then the new one', () => {
    const debts = Array.from({ length: 60 }, (_, index) => ({
      item: visit(index + 1),
      balanceAgorot: 100,
    }));
    const { parts } = allocate(10_000, debts, NEW);
    expect(ALLOCATION_MAX_ITEMS).toBe(50);
    expect(parts).toHaveLength(50);
    expect(parts[48]).toEqual({ item: visit(49), amountAgorot: 100 });
    expect(parts[49]).toEqual({ item: NEW, amountAgorot: 10_000 - 49 * 100 });
  });
});
