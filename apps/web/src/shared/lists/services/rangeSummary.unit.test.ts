import { isolate } from '@shared/localisation';
import { describe, expect, it } from 'vitest';
import { rangeSummary } from './rangeSummary';

const words = {
  range: ({ range, total }: { range: string; total: string }) => `Showing ${range} of ${total}`,
};

describe('rangeSummary', () => {
  it('says 1–20 of 312 on the first page', () => {
    expect(rangeSummary({ currentPage: 1, limit: 20, totalRecords: 312 }, words)).toBe(
      `Showing ${isolate('1–20')} of ${isolate('312')}`,
    );
  });

  it('ends the last page at the total', () => {
    expect(rangeSummary({ currentPage: 16, limit: 20, totalRecords: 312 }, words)).toBe(
      `Showing ${isolate('301–312')} of ${isolate('312')}`,
    );
  });

  it('says nothing for an empty list', () => {
    expect(rangeSummary({ currentPage: 1, limit: 20, totalRecords: 0 }, words)).toBeNull();
  });
});
