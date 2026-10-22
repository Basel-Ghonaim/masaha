import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { freshnessOf } from './freshness';

const NOW = new Date('2026-10-22T10:00:00Z');
const WORDS = CATALOGUES.ar.directory.page;

describe('freshnessOf', () => {
  it('dates a group, marks it stale, says nothing while missing', () => {
    expect(freshnessOf('2026-10-22T06:00:00Z', false, 'prices', NOW, 'ar', WORDS)).toEqual({
      line: 'آخر تحديث للأسعار اليوم',
      stale: null,
    });
    expect(freshnessOf('2026-08-20T06:00:00Z', true, 'hours', NOW, 'ar', WORDS)).toEqual({
      line: 'آخر تحديث لساعات العمل قبل 63 يومًا',
      stale: 'قد يكون تغيّر',
    });
    expect(
      freshnessOf(
        '2026-10-21T06:00:00Z',
        false,
        'contacts',
        NOW,
        'en',
        CATALOGUES.en.directory.page,
      ),
    ).toEqual({ line: 'Contacts updated yesterday', stale: null });
    expect(freshnessOf(null, true, 'amenities', NOW, 'ar', WORDS)).toEqual({
      line: null,
      stale: null,
    });
  });
});
