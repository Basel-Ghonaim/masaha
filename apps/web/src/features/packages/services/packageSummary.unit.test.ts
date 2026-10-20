import { CATALOGUES } from '@shared/copy';
import { priceText } from '@shared/lib';
import { isolate } from '@shared/localisation';
import { describe, expect, it } from 'vitest';
import type { ShiftChoice } from '../types/ShiftChoice';
import { priceLineOf, summaryOf, type SummaryTerms } from './packageSummary';

const AR = CATALOGUES.ar.packages;
const EN = CATALOGUES.en.packages;

const SHIFTS: ShiftChoice[] = [
  { id: 2, nameAr: 'صباحي', nameEn: 'Morning' },
  { id: 4, nameAr: 'مسائي', nameEn: null },
];

const BARE: SummaryTerms = {
  validityDays: 30,
  totalDays: null,
  daysPerWeek: null,
  hoursPerDay: null,
  totalHours: null,
  audience: 'GENERAL',
  shiftId: null,
};

/** The Arabic summary of `terms`. */
const arabic = (terms: Partial<SummaryTerms>) => summaryOf({ ...BARE, ...terms }, SHIFTS, AR, 'ar');

describe('a package’s summary', () => {
  it('words a package’s terms in Arabic plurals, and its price by billing', () => {
    expect([1, 2, 7, 30, 11].map((validityDays) => arabic({ validityDays }))).toEqual([
      'صالحة يومًا واحدًا',
      'صالحة يومين',
      'صالحة 7 أيام',
      'صالحة 30 يومًا',
      'صالحة 11 يومًا',
    ]);
    expect(
      arabic({
        totalDays: 10,
        daysPerWeek: 2,
        hoursPerDay: 1,
        totalHours: 20,
        audience: 'STUDENT',
        shiftId: 2,
      }),
    ).toBe(
      'صالحة 30 يومًا · 10 أيام · يومان بالأسبوع · ساعة واحدة باليوم · رصيد 20 ساعة · للطلاب · صباحي',
    );
    expect(priceLineOf({ billing: 'FIXED', priceAgorot: 15000 }, AR, 'ar')).toBe(
      priceText(15000, 'ar'),
    );
    expect(priceLineOf({ billing: 'PER_HOUR', priceAgorot: 500 }, EN, 'en')).toBe(
      `${isolate(priceText(500, 'en'))} an hour`,
    );
    expect(priceLineOf({ billing: 'PER_DAY', priceAgorot: 1250 }, EN, 'en')).toBe(
      `${isolate(priceText(1250, 'en'))} a day`,
    );
  });

  it('names the shift in English when it has an English name, else in Arabic, and none that is gone', () => {
    const english = (shiftId: number) => summaryOf({ ...BARE, shiftId }, SHIFTS, EN, 'en');

    expect(english(2)).toBe('valid 30 days · Morning');
    expect(english(4)).toBe('valid 30 days · مسائي');
    expect(english(9)).toBe('valid 30 days');
    expect(summaryOf({ ...BARE, validityDays: null, shiftId: 2 }, null, EN, 'en')).toBe('');
  });
});
