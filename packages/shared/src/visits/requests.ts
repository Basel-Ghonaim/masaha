import { z } from 'zod';

import { textSchema } from '../core/index.ts';
import { PRICE_AUDIENCES } from '../spaces/index.ts';

// The requests of the front desk's visit endpoints (docs/api/api-contract.md §5, Front desk
// (managed)).

export const VISITOR_NAME_MAX_LENGTH = 60;

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
