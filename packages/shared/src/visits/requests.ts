import { z } from 'zod';

import { textSchema } from '../core/index.ts';
import { PRICE_AUDIENCES, PRICE_MAX_AGOROT } from '../spaces/index.ts';

// The requests of the front desk's visit endpoints (docs/api/api-contract.md §5, Front desk
// (managed)).

export const VISITOR_NAME_MAX_LENGTH = 60;
export const CHARGE_REASON_MAX_LENGTH = 200;

// The largest id an Int column holds.
const id = z.number().int().positive().max(2_147_483_647);

/**
 * Checks a visitor in by name: the audience whose prices apply (general unless told), and one of
 * the space's shifts, or none.
 */
export const checkInVisitSchema = z.object({
  visitorName: textSchema(1, VISITOR_NAME_MAX_LENGTH),
  audience: z.enum(PRICE_AUDIENCES).default('GENERAL'),
  shiftId: id.nullable().optional(),
});
export type CheckInVisitRequest = z.infer<typeof checkInVisitSchema>;

/**
 * A visit's charge typed by hand, with why: whole agorot from 1 to a price's largest, and a reason
 * of 1–200 characters. The desk's check-out sends it for a visit with no rate; the owner prices an
 * unpriced visit with it.
 */
export const priceVisitSchema = z.object({
  amountAgorot: z.number().int().min(1).max(PRICE_MAX_AGOROT),
  reason: textSchema(1, CHARGE_REASON_MAX_LENGTH),
});
export type PriceVisitRequest = z.infer<typeof priceVisitSchema>;
