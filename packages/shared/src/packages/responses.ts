import type { PRICE_AUDIENCES } from '../spaces/index.ts';
import type { SUBSCRIPTION_BILLINGS } from './requests.ts';

// A space's packages (docs/api/api-contract.md §5, Packages (managed)).

/** A package, as its space's staff see it. A list's order is its array's. */
export interface SpacePackage {
  id: number;
  /** The package's own name within its space, retired ones included. */
  name: string;
  /** A subscription made from it ends this many days after it starts. */
  validityDays: number;
  /** Its limits; `null` for one it sets none of. */
  totalDays: number | null;
  daysPerWeek: number | null;
  hoursPerDay: number | null;
  totalHours: number | null;
  /** SUBSCRIPTION_BILLINGS. */
  billing: (typeof SUBSCRIPTION_BILLINGS)[number];
  /** Whole agorot: the price when `FIXED`, else the rate per hour or per day. */
  priceAgorot: number;
  /** PRICE_AUDIENCES. */
  audience: (typeof PRICE_AUDIENCES)[number];
  /** One of the space's shifts, or none. */
  shiftId: number | null;
  /** False: retired, no longer offered, still listed. */
  isActive: boolean;
}
