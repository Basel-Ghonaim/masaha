import type { GazaClock } from '@masaha/shared/core';
import type { LiveStatus } from '@masaha/shared/occupancy';
import type { OpeningRange } from '@masaha/shared/spaces';

// The live-status rule (docs/architecture/data-model.md › Live status; ADR 0008): pure, so the
// staff's read and the directory decide it alike. The caller reads the inputs; the time is given.

/** A space's week, Sunday (0) to Saturday (6), `null` for a closed day; `null` without any hours. */
export type Week = readonly (OpeningRange | null)[] | null;

/** A manual override: its state, until when. */
export interface Override {
  state: LiveStatus;
  until: Date;
}

export interface LiveStatusInput {
  /** Whether the space has an active owner. */
  verified: boolean;
  /** Whether an active `CLOSURE` announcement covers now. */
  closureNow: boolean;
  week: Week;
  /** Now, on Gaza's clock. */
  at: GazaClock;
  now: Date;
  /** The stored override, in force or not. */
  override: Override | null;
  capacity: number | null;
  /** The open visits plus the open subscription check-ins. */
  present: number;
}

/** Today's range when the space is open by its hours at `at`, else `null`. */
export function openRangeAt(week: Week, at: GazaClock): OpeningRange | null {
  const day = week?.[at.dayOfWeek] ?? null;
  return day && day.opensMinute <= at.minute && at.minute < day.closesMinute ? day : null;
}

/** Whether as many are present as the space seats; never without a capacity. */
export function isFull(present: number, capacity: number | null): boolean {
  return capacity !== null && present >= capacity;
}

/**
 * The override the rule uses: one in force while the space is verified, under no closure and open
 * by its hours; else `null`, however it is stored.
 */
export function overrideInUse({
  verified,
  closureNow,
  week,
  at,
  now,
  override,
}: LiveStatusInput): Override | null {
  return verified && !closureNow && openRangeAt(week, at) && override && override.until > now
    ? override
    : null;
}

/** The live status, in the data model's order; `null` when the space has none. */
export function liveStatus(input: LiveStatusInput): LiveStatus | null {
  const { verified, closureNow, week, at, capacity, present } = input;
  if (!verified) return null;
  if (closureNow) return 'CLOSED';
  if (week !== null && !openRangeAt(week, at)) return 'CLOSED';
  const override = overrideInUse(input);
  if (override) return override.state;
  if (week === null || capacity === null) return null;
  return isFull(present, capacity) ? 'FULL' : 'AVAILABLE';
}
