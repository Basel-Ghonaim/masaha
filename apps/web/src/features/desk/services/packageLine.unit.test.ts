import type { SpacePackage } from '@masaha/shared/packages';
import { describe, expect, it } from 'vitest';
import { packageLine } from './packageLine';

const TEN_DAYS: SpacePackage = {
  id: 3,
  name: '10 days',
  validityDays: 30,
  totalDays: 10,
  daysPerWeek: 3,
  hoursPerDay: null,
  totalHours: null,
  billing: 'FIXED',
  priceAgorot: 15000,
  audience: 'STUDENT',
  shiftId: null,
  isActive: true,
};

const words = {
  validity: ({ count }: { count: number }) => `${String(count)} days`,
  rate: ({ rate, unit }: { rate: string; unit: string }) => `${rate} ${unit}`,
  units: { PER_HOUR: 'per hour', PER_DAY: 'per day' },
  terms: {
    totalDays: ({ count }: { count: number }) => `${String(count)} days`,
    daysPerWeek: ({ count }: { count: number }) => `${String(count)} a week`,
    hoursPerDay: ({ count }: { count: number }) => `${String(count)} h a day`,
    totalHours: ({ count }: { count: number }) => `${String(count)} h in all`,
    student: 'Students',
    none: 'No extra terms',
  },
};
const price = (agorot: number) => `₪${String(agorot / 100)}`;

describe('packageLine', () => {
  it('says a package in one line: its name, its price, its validity and limits', () => {
    expect(packageLine(TEN_DAYS, words, price)).toEqual({
      value: 'pkg-3',
      title: '10 days',
      amount: '₪150',
      terms: '30 days · 10 days · 3 a week · Students',
    });
  });

  it('says a usage-based package’s rate by its unit, and a package with no limits plainly', () => {
    expect(
      packageLine(
        {
          ...TEN_DAYS,
          billing: 'PER_HOUR',
          priceAgorot: 500,
          totalDays: null,
          daysPerWeek: null,
          audience: 'GENERAL',
        },
        words,
        price,
      ),
    ).toEqual({
      value: 'pkg-3',
      title: '10 days',
      amount: '₪5 per hour',
      terms: '30 days · No extra terms',
    });
  });
});
