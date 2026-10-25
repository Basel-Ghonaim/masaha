import { describe, expect, it } from 'vitest';

import { favoritesOrder } from './favoritesOrder.ts';

// The user's saved spaces, newest saved first, as `favorites` answers them.
const SAVED = [5, 3, 9, 1, 7];

describe('favoritesOrder', () => {
  it('saved newest first; by distance the listed nearest first and those that left last', () => {
    expect(favoritesOrder(SAVED, null)).toEqual([5, 3, 9, 1, 7]);

    // 3, 1 and 7 are listed, nearest first; 5 and 9 left the directory, kept newest saved first.
    expect(favoritesOrder(SAVED, [7, 3, 1])).toEqual([7, 3, 1, 5, 9]);
    expect(favoritesOrder(SAVED, [])).toEqual([5, 3, 9, 1, 7]);
  });
});
