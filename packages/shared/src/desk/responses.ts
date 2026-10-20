import type { DomainErrorCode } from '../core/index.ts';

// The answers of the front desk's orchestrations (docs/api/api-contract.md §5, Front desk
// (managed)).

/** What a check-in warns of, in `meta.warnings`, in this order; it never refuses for them. */
export const DESK_WARNINGS = [
  'SPACE_FULL',
  'OUTSIDE_OPENING_HOURS',
] as const satisfies readonly DomainErrorCode[];
export type DeskWarning = (typeof DESK_WARNINGS)[number];
