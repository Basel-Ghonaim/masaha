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

  it('puts a quote mark before text that would open as a formula, numbers kept as numbers', () => {
    expect(
      csvOf(
        ['v'],
        [
          ['=HYPERLINK("http://x","Pay")'],
          ['+970599000201'],
          ['-5'],
          ['@SUM(A1)'],
          ['\tTab'],
          ['\rCR'],
          [-5],
          ['Sara = Sara'],
        ],
      ),
    ).toBe(
      '﻿' +
        [
          'v',
          `"'=HYPERLINK(""http://x"",""Pay"")"`,
          "'+970599000201",
          "'-5",
          "'@SUM(A1)",
          "'\tTab",
          `"'\rCR"`,
          '-5',
          'Sara = Sara',
        ].join('\r\n'),
    );
  });

  it('writes an empty value for none', () => {
    expect(csvOf(['a', 'b'], [[null, '']])).toBe('﻿a,b\r\n,');
  });
});
