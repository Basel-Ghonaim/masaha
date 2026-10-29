import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import {
  adminReportsQuerySchema,
  createReportSchema,
  DATA_REPORT_FIELDS,
  decideReportSchema,
} from './requests.ts';

/** The field errors a schema fails with on `body`, or null when it passes. */
function errorsOf(schema: typeof createReportSchema | typeof decideReportSchema, body: object) {
  const result = schema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

describe('createReportSchema', () => {
  it('takes one of the six fields, a message optional, its lines kept; «أخرى» needs its message', () => {
    expect(DATA_REPORT_FIELDS).toEqual([
      'PRICES',
      'HOURS',
      'CONTACT',
      'LOCATION',
      'AMENITIES',
      'OTHER',
    ]);
    for (const field of DATA_REPORT_FIELDS.filter((one) => one !== 'OTHER')) {
      expect(errorsOf(createReportSchema, { field })).toBeNull();
    }
    expect(createReportSchema.parse({ field: 'OTHER', message: ' السعر\r\nتغيّر ' })).toEqual({
      field: 'OTHER',
      message: 'السعر\nتغيّر',
    });
    expect(errorsOf(createReportSchema, { field: 'OTHER' })).toEqual({ message: ['required'] });
    expect(errorsOf(createReportSchema, { field: 'OTHER', message: '  ' })).toEqual({
      message: ['too_short'],
    });
    expect(errorsOf(createReportSchema, { field: 'HOURS', message: 'a'.repeat(500) })).toBeNull();
    expect(errorsOf(createReportSchema, { field: 'HOURS', message: 'a'.repeat(501) })).toEqual({
      message: ['too_long'],
    });
    expect(errorsOf(createReportSchema, { field: 'PHOTOS' })).toEqual({
      field: ['invalid_choice'],
    });
  });
});

describe('decideReportSchema', () => {
  it('resolves with a note or none; a dismissal needs its note', () => {
    expect(errorsOf(decideReportSchema, { status: 'RESOLVED' })).toBeNull();
    expect(decideReportSchema.parse({ status: 'RESOLVED', note: ' عُدّل ' })).toEqual({
      status: 'RESOLVED',
      note: 'عُدّل',
    });
    expect(errorsOf(decideReportSchema, { status: 'DISMISSED', note: 'صحيح' })).toBeNull();
    expect(errorsOf(decideReportSchema, { status: 'DISMISSED' })).toEqual({ note: ['required'] });
    expect(errorsOf(decideReportSchema, { status: 'OPEN' })).toEqual({
      status: ['invalid_choice'],
    });
    expect(errorsOf(decideReportSchema, { status: 'RESOLVED', note: 'a'.repeat(501) })).toEqual({
      note: ['too_long'],
    });
  });
});

describe('adminReportsQuerySchema', () => {
  it('pages, and filters by status, field and space, each optional', () => {
    expect(adminReportsQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(
      adminReportsQuerySchema.parse({ status: 'DECIDED', field: 'HOURS', spaceId: '7', page: '2' }),
    ).toEqual({ status: 'DECIDED', field: 'HOURS', spaceId: 7, page: 2, limit: 20 });
    expect(adminReportsQuerySchema.safeParse({ status: 'RESOLVED' }).success).toBe(false);
    expect(adminReportsQuerySchema.safeParse({ spaceId: '0' }).success).toBe(false);
  });

  it('filters by who handles a report, the admin or the owner', () => {
    expect(adminReportsQuerySchema.parse({ handledBy: 'OWNER' })).toEqual({
      handledBy: 'OWNER',
      page: 1,
      limit: 20,
    });
    expect(adminReportsQuerySchema.safeParse({ handledBy: 'ADMIN' }).success).toBe(true);
    expect(adminReportsQuerySchema.safeParse({ handledBy: 'owner' }).success).toBe(false);
  });
});
