import { describe, expect, it } from 'vitest';
import { moved, placed } from './moved';

describe('moved', () => {
  it('moves an id up one step, trading places with the one before it', () => {
    expect(moved([1, 2, 3], 2, 'up')).toEqual([2, 1, 3]);
  });

  it('moves an id down one step, trading places with the one after it', () => {
    expect(moved([1, 2, 3], 2, 'down')).toEqual([1, 3, 2]);
  });

  it('moves an id in the middle of a longer list without touching the others', () => {
    expect(moved([1, 2, 3, 4, 5], 3, 'up')).toEqual([1, 3, 2, 4, 5]);
  });

  it('leaves the order as it was for the first id up, the last id down, or an id not listed', () => {
    expect(moved([1, 2, 3], 1, 'up')).toEqual([1, 2, 3]);
    expect(moved([1, 2, 3], 3, 'down')).toEqual([1, 2, 3]);
    expect(moved([1, 2, 3], 9, 'up')).toEqual([1, 2, 3]);
  });
});

describe('placed', () => {
  it('sets an id at a position, counted from 1, the others keeping their order', () => {
    expect(placed([1, 2, 3, 4], 4, 1)).toEqual([4, 1, 2, 3]);
    expect(placed([1, 2, 3, 4], 1, 3)).toEqual([2, 3, 1, 4]);
    expect(placed([1, 2, 3, 4], 2, 4)).toEqual([1, 3, 4, 2]);
  });

  it('leaves the order as it was for its own position, or an id not listed', () => {
    expect(placed([1, 2, 3], 2, 2)).toEqual([1, 2, 3]);
    expect(placed([1, 2, 3], 9, 1)).toEqual([1, 2, 3]);
  });
});
