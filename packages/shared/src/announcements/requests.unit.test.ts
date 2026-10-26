import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import {
  announcementsQuerySchema,
  createAnnouncementSchema,
  editAnnouncementSchema,
  extendSubscriptionsSchema,
} from './requests.ts';

/** The field errors a post fails with, or null when it passes. */
function errorsOf(body: object) {
  const result = createAnnouncementSchema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

/** The field errors an edit fails with, or null when it passes. */
function errorsOfEdit(body: object) {
  const result = editAnnouncementSchema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

const START = '2026-10-24T08:00:00+03:00';
const LATER = '2026-10-25T08:00:00+03:00';

describe('createAnnouncementSchema', () => {
  it('takes a type of five and Arabic text of 1–500 characters, its lines kept; English optional', () => {
    expect(createAnnouncementSchema.parse({ type: 'CLOSURE', textAr: ' مغلق\r\nاليوم ' })).toEqual({
      type: 'CLOSURE',
      textAr: 'مغلق\nاليوم',
    });
    for (const type of ['GENERAL', 'OUTAGE', 'CLOSURE', 'OFFER', 'EVENT']) {
      expect(errorsOf({ type, textAr: 'نص' })).toBeNull();
    }
    expect(errorsOf({ type: 'NEWS', textAr: 'نص' })).toEqual({ type: ['invalid_choice'] });
    expect(errorsOf({ type: 'GENERAL' })).toEqual({ textAr: ['required'] });
    expect(errorsOf({ type: 'GENERAL', textAr: '  ' })).toEqual({ textAr: ['too_short'] });
    expect(errorsOf({ type: 'GENERAL', textAr: 'a'.repeat(500) })).toBeNull();
    expect(errorsOf({ type: 'GENERAL', textAr: 'a'.repeat(501) })).toEqual({
      textAr: ['too_long'],
    });
    expect(errorsOf({ type: 'GENERAL', textAr: 'نص', textEn: 'Text' })).toBeNull();
    expect(errorsOf({ type: 'GENERAL', textAr: 'نص', textEn: null })).toBeNull();
    expect(errorsOf({ type: 'GENERAL', textAr: 'نص', textEn: '' })).toEqual({
      textEn: ['too_short'],
    });
  });

  it('takes instants with an offset, an end optional or null, and an end after the start', () => {
    expect(errorsOf({ type: 'CLOSURE', textAr: 'نص', startsAt: START, endsAt: LATER })).toBeNull();
    expect(errorsOf({ type: 'CLOSURE', textAr: 'نص', endsAt: null })).toBeNull();
    expect(errorsOf({ type: 'CLOSURE', textAr: 'نص', startsAt: '2026-10-24T08:00:00' })).toEqual({
      startsAt: ['invalid_format'],
    });
    expect(errorsOf({ type: 'CLOSURE', textAr: 'نص', startsAt: START, endsAt: START })).toEqual({
      endsAt: ['out_of_range'],
    });
    expect(errorsOf({ type: 'CLOSURE', textAr: 'نص', startsAt: LATER, endsAt: START })).toEqual({
      endsAt: ['out_of_range'],
    });
  });
});

describe('editAnnouncementSchema', () => {
  it('takes any of the fields; null clears the English text and the end, never the Arabic', () => {
    expect(editAnnouncementSchema.parse({})).toEqual({});
    expect(editAnnouncementSchema.parse({ textEn: null, endsAt: null })).toEqual({
      textEn: null,
      endsAt: null,
    });
    expect(errorsOfEdit({ textAr: null })).toEqual({ textAr: ['invalid_format'] });
    expect(errorsOfEdit({ startsAt: null })).toEqual({ startsAt: ['invalid_format'] });
    expect(errorsOfEdit({ startsAt: LATER, endsAt: START })).toEqual({ endsAt: ['out_of_range'] });
  });
});

describe('announcementsQuerySchema', () => {
  it('pages one state, RUNNING when absent', () => {
    expect(announcementsQuerySchema.parse({})).toEqual({ state: 'RUNNING', page: 1, limit: 20 });
    expect(announcementsQuerySchema.parse({ state: 'ENDED', page: '2' })).toMatchObject({
      state: 'ENDED',
      page: 2,
    });
    expect(announcementsQuerySchema.safeParse({ state: 'DELETED' }).success).toBe(false);
  });
});

describe('extendSubscriptionsSchema', () => {
  it('days are whole, 1 to 365', () => {
    const errorsOfDays = (days: unknown) => {
      const body = { days };
      const result = extendSubscriptionsSchema.safeParse(body);
      return result.success ? null : toFieldErrors(result.error.issues, body);
    };
    expect(extendSubscriptionsSchema.parse({ days: 1 })).toEqual({ days: 1 });
    expect(extendSubscriptionsSchema.parse({ days: 365 })).toEqual({ days: 365 });
    expect(errorsOfDays(0)).toEqual({ days: ['out_of_range'] });
    expect(errorsOfDays(366)).toEqual({ days: ['out_of_range'] });
    expect(errorsOfDays(1.5)).toHaveProperty('days');
    expect(errorsOfDays('3')).toHaveProperty('days');
    expect(errorsOfDays(undefined)).toHaveProperty('days');
  });
});
