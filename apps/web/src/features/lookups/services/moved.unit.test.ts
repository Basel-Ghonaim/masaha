import { describe, expect, it } from 'vitest';
import { moved } from './moved';

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
