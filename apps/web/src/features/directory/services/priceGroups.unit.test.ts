import type { Price, Shift } from '@masaha/shared/spaces';
import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { cellSpan, priceGroups } from './priceGroups';

const WORDS = CATALOGUES.ar.directory.page;
const LRI = '⁦';
const PDI = '⁩';

const price = (change: Partial<Price>): Price => ({
  period: 'DAY',
  audience: 'GENERAL',
  shiftId: null,
  labelAr: null,
  labelEn: null,
  amountAgorot: 2000,
  ...change,
});
const SHIFTS: Shift[] = [
  { id: 6, nameAr: 'صباحي', nameEn: 'Morning', startsMinute: 480, endsMinute: 900 },
  { id: 7, nameAr: 'مسائي', nameEn: null, startsMinute: 900, endsMinute: 1320 },
];

describe('priceGroups', () => {
  it('general prices, then students; a label stands for its period', () => {
    const groups = priceGroups(
      [
        price({ audience: 'STUDENT', amountAgorot: 1500 }),
        price({ period: 'HOUR', amountAgorot: 600 }),
        price({ period: 'MONTH', labelAr: 'شهر مسائي', labelEn: null, amountAgorot: 25_000 }),
      ],
      SHIFTS,
      CATALOGUES.en.directory.page,
      'en',
    );
    expect(groups.tabs).toBeNull();
    expect(groups.audiences.map((group) => group.title)).toEqual([null, 'For students']);
    expect(groups.audiences[0]?.cells.map((cell) => [cell.label, cell.value])).toEqual([
      [{ text: 'Hour' }, '₪6'],
      [{ text: 'شهر مسائي', lang: 'ar', dir: 'rtl' }, '₪250'],
    ]);
    expect(groups.audiences[1]?.cells.map((cell) => cell.label.text)).toEqual(['Day']);
  });

  it('shift tabs only when a price names a saved shift: the whole day first, then each shift with prices', () => {
    const groups = priceGroups(
      [
        price({}),
        price({ shiftId: 6, amountAgorot: 1200 }),
        price({ shiftId: 99, amountAgorot: 900 }),
      ],
      SHIFTS,
      WORDS,
      'ar',
    );
    expect(groups.tabs?.map((tab) => [tab.label, tab.range])).toEqual([
      ['اليوم كاملًا', null],
      ['صباحي', `${LRI}08:00–15:00${PDI}`],
    ]);
    expect(groups.tabs?.[1]?.audiences[0]?.cells.map((cell) => cell.label.text)).toEqual(['يوم']);
    expect(priceGroups([price({ shiftId: 99 })], SHIFTS, WORDS, 'ar').tabs).toBeNull();
  });

  it('an incomplete last row shares its width (counts 1–7)', () => {
    const spans = (count: number) =>
      Array.from({ length: count }, (_, index) => cellSpan(index, count));
    expect(spans(1)).toEqual(['col-span-2 md:col-span-4']);
    expect(spans(2)).toEqual(['md:col-span-2', 'md:col-span-2']);
    expect(spans(3)).toEqual(['', '', 'col-span-2 md:col-span-2']);
    expect(spans(4)).toEqual(['', '', '', '']);
    expect(spans(5)).toEqual(['', '', '', '', 'col-span-2 md:col-span-4']);
    expect(spans(6)).toEqual(['', '', '', '', 'md:col-span-2', 'md:col-span-2']);
    expect(spans(7)).toEqual(['', '', '', '', '', '', 'col-span-2 md:col-span-2']);
  });
});
