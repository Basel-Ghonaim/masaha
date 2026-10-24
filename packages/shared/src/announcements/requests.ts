import { z } from 'zod';

import { paginationQuerySchema, paragraphSchema } from '../core/index.ts';

// The requests of the managed announcements endpoints (docs/api/api-contract.md §5, Announcements
// (managed)).

export const ANNOUNCEMENT_TYPES = ['GENERAL', 'OUTAGE', 'CLOSURE', 'OFFER', 'EVENT'] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

/** An announcement's state now, from its start and end (docs/architecture/data-model.md). */
export const ANNOUNCEMENT_STATES = ['RUNNING', 'UPCOMING', 'ENDED'] as const;
export type AnnouncementState = (typeof ANNOUNCEMENT_STATES)[number];

export const ANNOUNCEMENT_TEXT_MAX_LENGTH = 500;

const text = paragraphSchema(1, ANNOUNCEMENT_TEXT_MAX_LENGTH);
const instant = z.iso.datetime({ offset: true });

const fields = {
  type: z.enum(ANNOUNCEMENT_TYPES),
  textAr: text,
  textEn: text.nullable(),
  startsAt: instant,
  endsAt: instant.nullable(),
};

/** An end, when both are given, after the start: refused on `endsAt` with `out_of_range`. */
const endAfterStart = ({ startsAt, endsAt }: { startsAt?: string; endsAt?: string | null }) =>
  startsAt === undefined ||
  endsAt === undefined ||
  endsAt === null ||
  Date.parse(endsAt) > Date.parse(startsAt);

/**
 * A new announcement: its type, its Arabic text, its English text when given; its start, now when
 * absent («يبدأ الآن»); its end, none when absent or `null`. The period's other bounds are the
 * server's, against its clock.
 */
export const createAnnouncementSchema = z
  .object({
    type: fields.type,
    textAr: fields.textAr,
    textEn: fields.textEn.optional(),
    startsAt: fields.startsAt.optional(),
    endsAt: fields.endsAt.optional(),
  })
  .refine(endAfterStart, { path: ['endsAt'], params: { code: 'out_of_range' } });
export type CreateAnnouncementRequest = z.infer<typeof createAnnouncementSchema>;

/**
 * Edits an announcement: any of its fields; what is absent is kept, `textEn: null` clears the English
 * text and `endsAt: null` removes the end.
 */
export const editAnnouncementSchema = z
  .object(fields)
  .partial()
  .refine(endAfterStart, { path: ['endsAt'], params: { code: 'out_of_range' } });
export type EditAnnouncementRequest = z.infer<typeof editAnnouncementSchema>;

/** The managed list: one state's page, `RUNNING` when absent. */
export const announcementsQuerySchema = paginationQuerySchema.extend({
  state: z.enum(ANNOUNCEMENT_STATES).default('RUNNING'),
});
export type AnnouncementsQuery = z.infer<typeof announcementsQuerySchema>;
