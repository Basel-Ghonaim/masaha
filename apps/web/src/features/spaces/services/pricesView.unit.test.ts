import type { Price } from '@masaha/shared/spaces';
import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { pricesTable, pricesView } from './pricesView';

const price = (part: Partial<Price>): Price => ({
  period: 'DAY',
  audience: 'GENERAL',
  shiftId: null,
  labelAr: null,
  labelEn: null,
  amountAgorot: 2000,
  ...part,
});

describe('pricesView', () => {
  it('shows the prices with no shift first, then by period, everyone’s before the students’', () => {
    const rows = [
      price({ period: 'MONTH', audience: 'STUDENT' }),
      price({ period: 'HOUR', shiftId: 4 }),
      price({ period: 'MONTH' }),
      price({ period: 'HOUR' }),
    ];

    expect(pricesView(rows).rows).toEqual([rows[3], rows[2], rows[0], rows[1]]);
  });

  it('needs «لمن» only with a student price, and «الوردية» only with a shift’s', () => {
    expect(pricesView([price({})])).toMatchObject({ students: false, shifts: false });
    expect(pricesView([price({ audience: 'STUDENT' })])).toMatchObject({
      students: true,
      shifts: false,
    });
    expect(pricesView([price({ shiftId: 4 })])).toMatchObject({ students: false, shifts: true });
  });
});

describe('pricesTable', () => {
  it('names a labelled price by its label, a shift by its name, the amount in shekels', () => {
    const table = pricesTable(
      {
        prices: [
          price({ period: 'MONTH', labelAr: 'باقة المساء', labelEn: 'Evening pass', shiftId: 4 }),
        ],
        hours: {
          days: [],
          worksEvenings: false,
          shifts: [
            { id: 4, nameAr: 'المسائية', nameEn: null, startsMinute: 780, endsMinute: 1200 },
          ],
        },
      },
      CATALOGUES.en.spaces.editor.prices,
      true,
    );

    expect(table.columns).toEqual({
      period: 'Period',
      audience: null,
      shift: 'Shift',
      price: 'Price',
    });
    expect(table.rows[0]).toMatchObject({ period: 'Evening pass', shift: 'المسائية' });
    expect(table.rows[0]?.amount).toContain('₪20');
  });
});
