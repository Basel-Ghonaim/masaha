import type { Price } from '@masaha/shared/spaces';
import { describe, expect, it } from 'vitest';
import { publishedChoices } from './publishedChoices';

const price = (change: Partial<Price>): Price => ({
  period: 'MONTH',
  audience: 'GENERAL',
  shiftId: null,
  labelAr: null,
  labelEn: null,
  amountAgorot: 30000,
  ...change,
});

const words = {
  periods: { WEEK: 'Weekly', MONTH: 'Monthly' },
  students: '· students',
  validity: ({ count }: { count: number }) => `${String(count)} days`,
};
const format = { language: 'en' as const, price: (agorot: number) => `₪${String(agorot / 100)}` };

describe('publishedChoices', () => {
  it('offers the standard week and month prices, named, sent by their key', () => {
    const options = publishedChoices(
      [
        price({ period: 'HOUR', amountAgorot: 500 }),
        price({ period: 'WEEK', amountAgorot: 9000 }),
        price({ audience: 'STUDENT', shiftId: 2, amountAgorot: 20000 }),
        price({ labelAr: 'شهر المكتب', labelEn: 'Desk month' }),
      ],
      [{ id: 2, nameAr: 'صباحي', nameEn: 'Morning', startsMinute: 480, endsMinute: 840 }],
      words,
      format,
    );

    expect(options.map(({ line }) => line)).toEqual([
      { value: 'price-WEEK-GENERAL-none', title: 'Weekly', amount: '₪90', terms: '7 days' },
      {
        value: 'price-MONTH-STUDENT-2',
        title: 'Monthly · students · Morning',
        amount: '₪200',
        terms: '30 days',
      },
    ]);
    expect(options.map(({ request }) => request)).toEqual([
      { period: 'WEEK', audience: 'GENERAL', name: 'Weekly' },
      { period: 'MONTH', audience: 'STUDENT', shiftId: 2, name: 'Monthly · students · Morning' },
    ]);
    expect(options.map(({ days }) => days)).toEqual([7, 30]);
  });
});
