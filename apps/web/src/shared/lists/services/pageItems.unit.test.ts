import { describe, expect, it } from 'vitest';
import { pageItems } from './pageItems';

describe('pageItems', () => {
  it('lists every page when there are seven or fewer', () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps the first and last pages and the pages around the current one, with gaps between', () => {
    expect(pageItems(5, 10)).toEqual([1, 'gap-start', 4, 5, 6, 'gap-end', 10]);
  });

  it('keeps seven places near either end', () => {
    expect(pageItems(1, 10)).toEqual([1, 2, 3, 4, 5, 'gap-end', 10]);
    expect(pageItems(3, 10)).toEqual([1, 2, 3, 4, 5, 'gap-end', 10]);
    expect(pageItems(8, 10)).toEqual([1, 'gap-start', 6, 7, 8, 9, 10]);
    expect(pageItems(10, 10)).toEqual([1, 'gap-start', 6, 7, 8, 9, 10]);
  });
});
