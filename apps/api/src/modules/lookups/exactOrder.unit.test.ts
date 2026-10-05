import { describe, expect, it } from 'vitest';

import { exactOrder } from './exactOrder.ts';

const list = [
  { id: 4, sortOrder: 0 },
  { id: 7, sortOrder: 1 },
  { id: 9, sortOrder: 2 },
];

describe('exactOrder', () => {
  it('places each row at its index, and returns only the rows that move', () => {
    expect(exactOrder(list, [7, 4, 9])).toEqual([
      { id: 7, sortOrder: 0 },
      { id: 4, sortOrder: 1 },
    ]);
  });

  it('returns nothing for the order the list already has', () => {
    expect(exactOrder(list, [4, 7, 9])).toEqual([]);
    expect(exactOrder([], [])).toEqual([]);
  });

  it('renumbers rows that share a place', () => {
    const seeded = [
      { id: 1, sortOrder: 5 },
      { id: 2, sortOrder: 5 },
    ];

    expect(exactOrder(seeded, [1, 2])).toEqual([
      { id: 1, sortOrder: 0 },
      { id: 2, sortOrder: 1 },
    ]);
  });

  it.each([
    ['a missing id', [4, 7]],
    ['an extra id', [4, 7, 9, 12]],
    ['an unknown id in place of one', [4, 7, 12]],
    ['a repeated id', [4, 7, 7, 9]],
    ['a repeated id in place of one', [4, 4, 9]],
  ])('answers conflict for %s', (_case, ids) => {
    expect(() => exactOrder(list, ids)).toThrow(
      expect.objectContaining({ type: 'conflict', code: undefined }),
    );
  });
});
