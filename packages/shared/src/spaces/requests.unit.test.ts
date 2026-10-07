import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { createSpaceSchema, updateSpaceHoursSchema, updateSpaceProfileSchema } from './requests.ts';

const SPACE = {
  nameEn: 'Focus Hub',
  areaId: 3,
  addressAr: 'شارع الشهداء',
  location: { lat: 31.52, lng: 34.45 },
};

/** The field errors a create request fails with, or null when it passes. */
function errorsOf(body: object) {
  const result = createSpaceSchema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

describe('createSpaceSchema', () => {
  it('takes a space with only its English name, its area, its Arabic address and its pin', () => {
    expect(createSpaceSchema.parse(SPACE)).toEqual(SPACE);
  });

  it('requires the English name and leaves the Arabic one optional', () => {
    expect(errorsOf({ ...SPACE, nameEn: undefined })).toEqual({ nameEn: ['required'] });
    expect(errorsOf({ ...SPACE, nameAr: null })).toBeNull();
    expect(errorsOf({ ...SPACE, nameAr: 'فوكس هب' })).toBeNull();
  });

  it('requires the Arabic address and leaves the English one and both landmarks optional', () => {
    expect(errorsOf({ ...SPACE, addressAr: undefined })).toEqual({ addressAr: ['required'] });
    expect(errorsOf({ ...SPACE, addressEn: null, landmarkAr: null, landmarkEn: null })).toBeNull();
  });

  it('lets a description break lines, and a name not', () => {
    expect(createSpaceSchema.parse({ ...SPACE, descriptionEn: 'Quiet.\nDesks.' })).toMatchObject({
      descriptionEn: 'Quiet.\nDesks.',
    });
    expect(errorsOf({ ...SPACE, nameEn: 'Focus\nHub' })).toEqual({ nameEn: ['invalid_format'] });
  });

  it('refuses a pin outside the Gaza Strip on the location as a whole', () => {
    expect(errorsOf({ ...SPACE, location: { lat: 31.9, lng: 35.2 } })).toEqual({
      location: ['out_of_range'],
    });
  });

  it('requires the pin', () => {
    expect(errorsOf({ ...SPACE, location: undefined })).toEqual({ location: ['required'] });
  });

  it('refuses an empty text rather than taking it for none', () => {
    expect(errorsOf({ ...SPACE, nameAr: ' ' })).toEqual({ nameAr: ['too_short'] });
  });
});

describe('updateSpaceProfileSchema', () => {
  it('takes any part of the profile, and nothing', () => {
    expect(updateSpaceProfileSchema.parse({})).toEqual({});
    expect(updateSpaceProfileSchema.parse({ landmarkEn: null })).toEqual({ landmarkEn: null });
  });

  it('never clears a required field', () => {
    expect(updateSpaceProfileSchema.safeParse({ nameEn: null }).success).toBe(false);
    expect(updateSpaceProfileSchema.safeParse({ addressAr: null }).success).toBe(false);
    expect(updateSpaceProfileSchema.safeParse({ location: null }).success).toBe(false);
  });
});

describe('updateSpaceHoursSchema', () => {
  const OPEN = { opensMinute: 480, closesMinute: 1080 };
  // Sunday to Thursday 08:00–18:00, Friday closed, Saturday around the clock.
  const DAYS = [OPEN, OPEN, OPEN, OPEN, OPEN, null, { opensMinute: 0, closesMinute: 1440 }];
  const MORNING = { nameAr: 'صباحية', nameEn: 'Morning', startsMinute: 480, endsMinute: 780 };

  function hoursErrors(body: object) {
    const result = updateSpaceHoursSchema.safeParse(body);
    return result.success ? null : toFieldErrors(result.error.issues, body);
  }

  it('takes seven days, each closed or one range, a day around the clock among them, and its shifts', () => {
    const body = {
      days: DAYS,
      shifts: [
        { ...MORNING, id: 4 },
        { ...MORNING, nameAr: 'مسائية', nameEn: null, startsMinute: 780, endsMinute: 1080 },
      ],
    };

    expect(updateSpaceHoursSchema.parse(body)).toEqual(body);
    expect(hoursErrors({ days: DAYS, shifts: [] })).toBeNull();
  });

  it('wants exactly seven days', () => {
    expect(hoursErrors({ days: DAYS.slice(1), shifts: [] })).toEqual({ days: ['too_short'] });
    expect(hoursErrors({ days: [...DAYS, null], shifts: [] })).toEqual({ days: ['too_long'] });
  });

  it('refuses a day that closes before it opens, or a time outside the day', () => {
    const days = [...DAYS];
    days[1] = { opensMinute: 600, closesMinute: 600 };
    days[2] = { opensMinute: 0, closesMinute: 1441 };

    expect(hoursErrors({ days, shifts: [] })).toEqual({
      'days.1.closesMinute': ['out_of_range'],
      'days.2.closesMinute': ['out_of_range'],
    });
  });

  it('refuses a shift that ends before it starts, and wants its Arabic name only', () => {
    expect(
      hoursErrors({ days: DAYS, shifts: [{ ...MORNING, nameEn: null, endsMinute: 400 }] }),
    ).toEqual({ 'shifts.0.endsMinute': ['out_of_range'] });
    expect(hoursErrors({ days: DAYS, shifts: [{ ...MORNING, nameAr: undefined }] })).toEqual({
      'shifts.0.nameAr': ['required'],
    });
  });

  it('keeps a shift inside the hours of at least one open day', () => {
    const days = [OPEN, { opensMinute: 480, closesMinute: 840 }, null, null, null, null, null];
    const evening = { ...MORNING, nameAr: 'مسائية', startsMinute: 840, endsMinute: 1080 };
    const night = { ...MORNING, nameAr: 'ليلية', startsMinute: 1080, endsMinute: 1320 };

    expect(hoursErrors({ days, shifts: [evening] })).toBeNull();
    expect(hoursErrors({ days, shifts: [evening, night] })).toEqual({
      'shifts.1': ['out_of_range'],
    });
    expect(hoursErrors({ days: Array(7).fill(null), shifts: [MORNING] })).toEqual({
      'shifts.0': ['out_of_range'],
    });
  });

  it('refuses two shifts of one Arabic name, or one shift twice', () => {
    const evening = { ...MORNING, startsMinute: 780, endsMinute: 1080 };

    expect(hoursErrors({ days: DAYS, shifts: [MORNING, evening] })).toEqual({
      'shifts.1.nameAr': ['not_unique'],
    });
    expect(
      hoursErrors({
        days: DAYS,
        shifts: [
          { ...MORNING, id: 4 },
          { ...evening, nameAr: 'مسائية', id: 4 },
        ],
      }),
    ).toEqual({ 'shifts.1.id': ['not_unique'] });
  });

  it('takes at most ten shifts', () => {
    const shifts = Array.from({ length: 11 }, (_, i) => ({
      ...MORNING,
      nameAr: `وردية ${String(i)}`,
    }));

    expect(hoursErrors({ days: DAYS, shifts })).toEqual({ shifts: ['too_long'] });
  });
});
