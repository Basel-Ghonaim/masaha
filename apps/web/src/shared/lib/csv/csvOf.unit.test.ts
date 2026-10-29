import { describe, expect, it } from 'vitest';
import { csvOf } from './csvOf';

describe('csvOf', () => {
  it('quotes commas, quotes and line breaks, and starts with a BOM', () => {
    expect(
      csvOf(
        ['الاسم', 'المبلغ', 'ملاحظة'],
        [
          ['رهف', 45, 'دفعة, أولى'],
          ['Sara "S"', 120.5, 'سطر\nثانٍ'],
          ['A', 0, 'with\rCR'],
        ],
      ),
    ).toBe(
      '﻿' +
        [
          'الاسم,المبلغ,ملاحظة',
          'رهف,45,"دفعة, أولى"',
          '"Sara ""S""",120.5,"سطر\nثانٍ"',
          'A,0,"with\rCR"',
        ].join('\r\n'),
    );
  });

  it('writes an empty value for none', () => {
    expect(csvOf(['a', 'b'], [[null, '']])).toBe('﻿a,b\r\n,');
  });
});
