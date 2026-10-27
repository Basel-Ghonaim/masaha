import { z } from 'zod';

import { paginationQuerySchema, textSchema } from '../core/index.ts';
import { AUDIT_ACTIONS, type AuditAction } from './actions.ts';

// The audit logs' queries (docs/api/api-contract.md › Audit log).

/** The logs' periods: from the Gaza midnight 29 days before today, or all time. */
export const AUDIT_PERIODS = ['LAST_30_DAYS', 'ALL'] as const;
export type AuditPeriod = (typeof AUDIT_PERIODS)[number];

/** The most actions one filter names: a group of the web's action types fits in it. */
export const AUDIT_ACTIONS_MAX = 30;
export const AUDIT_SEARCH_MAX_LENGTH = 80;

// The largest id an Int column holds.
const MAX_ID = 2_147_483_647;
const actorId = z.coerce.number().int().min(1).max(MAX_ID);

const isAction = (part: string): part is AuditAction =>
  (AUDIT_ACTIONS as readonly string[]).includes(part);

/** `actions=payment.recorded,payment.voided`: a comma list of known actions, each once, at most 30. */
const actionList = z
  .string()
  .refine((text) => text.split(',').every(isAction), { params: { code: 'invalid_choice' } })
  .transform((text) => [...new Set(text.split(','))] as AuditAction[])
  .pipe(z.array(z.enum(AUDIT_ACTIONS)).max(AUDIT_ACTIONS_MAX));

/**
 * What both logs filter by: the period (the last 30 days by default), the target's name (`q`), the
 * actions; paged.
 */
const auditQuery = paginationQuerySchema.extend({
  period: z.enum(AUDIT_PERIODS).default('LAST_30_DAYS'),
  q: textSchema(1, AUDIT_SEARCH_MAX_LENGTH).optional(),
  actions: actionList.optional(),
});

/** The owner's log of the space: an actor is a person's id, `MASAHA` (the admin) or `SYSTEM`. */
export const spaceAuditQuerySchema = auditQuery.extend({
  actor: z.union([z.enum(['MASAHA', 'SYSTEM']), actorId]).optional(),
});
export type SpaceAuditQuery = z.output<typeof spaceAuditQuerySchema>;

/** The admin's log of the platform's events: an actor is a person's id. */
export const platformAuditQuerySchema = auditQuery.extend({ actor: actorId.optional() });
export type PlatformAuditQuery = z.output<typeof platformAuditQuerySchema>;
