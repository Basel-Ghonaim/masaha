// A space's capacity and its state now (docs/api/api-contract.md §5, Capacity (managed) and
// Occupancy (managed)).

/** A space's capacity, private to its staff. */
export interface SpaceCapacity {
  /** The most people it seats; `null`: none set. */
  capacity: number | null;
}

/** The live status, a state and never a count (docs/architecture/data-model.md › Live status). */
export const LIVE_STATUSES = ['AVAILABLE', 'FULL', 'CLOSED'] as const;
export type LiveStatus = (typeof LIVE_STATUSES)[number];

/** Someone present at the space: an open visit, or an open subscription check-in. */
export type PresentPerson =
  | {
      kind: 'VISIT';
      id: number;
      /** The visitor's name, or their customer's. */
      name: string;
      /** When they checked in. */
      since: string;
      /** What the stay costs so far, at the visit's rates; `null` with no rate. */
      chargeNowAgorot: number | null;
    }
  | { kind: 'CHECK_IN'; id: number; customerId: number; name: string; since: string };

/** A space's state now, as the public sees it: its live status, never a count (ADR 0008). */
export interface PublicOccupancy {
  /** `null` when the space has none (unverified, no hours, or no capacity). */
  status: LiveStatus | null;
}

/** A space's state now, as its staff see it: whole, the people present included. */
export interface SpaceOccupancyNow {
  /** The live status; `null` when the space has none (unverified, no hours, or no capacity). */
  status: LiveStatus | null;
  /** The most people it seats; `null`: none set. */
  capacity: number | null;
  /** How many are present: the open visits plus the open subscription check-ins. */
  present: number;
  /** The manual override in force, or `null`. */
  override: { state: LiveStatus; until: string } | null;
  /** Who is present, the earliest checked in first. */
  people: PresentPerson[];
}
