import { z } from 'zod';

import { paginationQuerySchema, paragraphSchema } from '../core/index.ts';

// The requests of the data reports' endpoints (docs/api/api-contract.md §5, Data reports).

/** The field groups a report names; «أخرى» (`OTHER`) carries its message. */
export const DATA_REPORT_FIELDS = [
  'PRICES',
  'HOURS',
  'CONTACT',
  'LOCATION',
  'AMENITIES',
  'OTHER',
] as const;
export type DataReportField = (typeof DATA_REPORT_FIELDS)[number];

/** What a decision makes of an open report: resolved, or dismissed with a reply. */
export const DATA_REPORT_DECISIONS = ['RESOLVED', 'DISMISSED'] as const;
export type DataReportDecision = (typeof DATA_REPORT_DECISIONS)[number];

export type DataReportStatus = 'OPEN' | DataReportDecision;

export const REPORT_TEXT_MAX_LENGTH = 500;

const text = paragraphSchema(1, REPORT_TEXT_MAX_LENGTH);
const id = z.coerce.number().int().positive().max(2_147_483_647);

/** A report of a space's wrong information: its field group, and a message («أخرى» needs one). */
export const createReportSchema = z
  .object({ field: z.enum(DATA_REPORT_FIELDS), message: text.optional() })
  .refine(({ field, message }) => field !== 'OTHER' || message !== undefined, {
    path: ['message'],
    params: { code: 'required' },
  });
export type CreateReportRequest = z.infer<typeof createReportSchema>;

/** A decision of an open report, with its reply to the reporter: optional, a dismissal's required. */
export const decideReportSchema = z
  .object({ status: z.enum(DATA_REPORT_DECISIONS), note: text.optional() })
  .refine(({ status, note }) => status !== 'DISMISSED' || note !== undefined, {
    path: ['note'],
    params: { code: 'required' },
  });
export type DecideReportRequest = z.infer<typeof decideReportSchema>;

/** The lists' filter: the open reports, or those decided (resolved or dismissed). */
export const REPORT_STATUS_FILTERS = ['OPEN', 'DECIDED'] as const;
export type ReportStatusFilter = (typeof REPORT_STATUS_FILTERS)[number];

/** The user's own reports: a page, newest first, all or by status. */
export const myReportsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(REPORT_STATUS_FILTERS).optional(),
});
export type MyReportsQuery = z.infer<typeof myReportsQuerySchema>;

/** A space's reports, as its owner lists them: by status and field group too. */
export const spaceReportsQuerySchema = myReportsQuerySchema.extend({
  field: z.enum(DATA_REPORT_FIELDS).optional(),
});
export type SpaceReportsQuery = z.infer<typeof spaceReportsQuerySchema>;

/** Every space's reports, as the admin lists them: by space too. */
export const adminReportsQuerySchema = spaceReportsQuerySchema.extend({
  spaceId: id.optional(),
});
export type AdminReportsQuery = z.infer<typeof adminReportsQuerySchema>;
