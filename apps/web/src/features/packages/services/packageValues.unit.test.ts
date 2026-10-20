import { createPackageSchema, type SpacePackage } from '@masaha/shared/packages';
import { describe, expect, it } from 'vitest';
import { packageInput, valuesOf } from './packageValues';

const MORNING: SpacePackage = {
  id: 3,
  name: 'صباحي',
  validityDays: 30,
  totalDays: null,
  daysPerWeek: 5,
  hoursPerDay: 4,
  totalHours: null,
  billing: 'PER_DAY',
  priceAgorot: 1250,
  audience: 'STUDENT',
  shiftId: 2,
  isActive: true,
};

describe('a package’s values', () => {
  it('sends a limit turned off as none and one left empty as empty; reads Arabic digits; an amount in shekels as agorot', () => {
    expect(
      packageInput({
        ...valuesOf(null),
        name: 'شهري',
        validityDays: '٣٠',
        limits: ['totalDays', 'hoursPerDay'],
        totalDays: '٢٠',
        hoursPerDay: '',
        // Typed once, then the limit turned off: it is not sent.
        daysPerWeek: '5',
        priceAgorot: '١٥٠.٥',
        shiftId: '',
      }),
    ).toEqual({
      name: 'شهري',
      validityDays: 30,
      totalDays: 20,
      daysPerWeek: null,
      hoursPerDay: '',
      totalHours: null,
      billing: 'FIXED',
      priceAgorot: 15050,
      audience: 'GENERAL',
      shiftId: null,
    });
  });

  it('hands back a count it cannot read as typed, and a validity left blank as none', () => {
    const input = packageInput({
      ...valuesOf(null),
      validityDays: '',
      limits: ['totalHours'],
      totalHours: '1.5',
    });

    expect(input.validityDays).toBeUndefined();
    expect(input.totalHours).toBe('1.5');
  });

  it('fills the fields from a package, and a new one valid 30 days, fixed, for everyone, with no limit', () => {
    expect(valuesOf(MORNING)).toEqual({
      name: 'صباحي',
      validityDays: '30',
      limits: ['daysPerWeek', 'hoursPerDay'],
      totalDays: '',
      daysPerWeek: '5',
      hoursPerDay: '4',
      totalHours: '',
      billing: 'PER_DAY',
      priceAgorot: '12.50',
      audience: 'STUDENT',
      shiftId: '2',
    });
    expect(valuesOf(null)).toMatchObject({
      validityDays: '30',
      limits: [],
      billing: 'FIXED',
      audience: 'GENERAL',
      shiftId: '',
    });
  });

  it('sends a package’s own terms back unchanged, as the contract reads them', () => {
    const terms = createPackageSchema.parse(packageInput(valuesOf(MORNING)));

    expect({ ...terms, id: MORNING.id, isActive: MORNING.isActive }).toEqual(MORNING);
  });
});
