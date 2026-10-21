/** A point rounded to `NEAR_DECIMALS` decimals: the only form near me keeps. */
export type NearPoint = { lat: number; lng: number };

/**
 * Near me, in memory only: whether it is asking, has a point, or was refused (denied or
 * unavailable) or given a position too imprecise or outside the Strip; where the point came from;
 * and whether the lists sort by distance from it.
 */
export type NearState = {
  status: 'idle' | 'locating' | 'granted' | 'denied' | 'imprecise';
  point: NearPoint | null;
  source: 'device' | 'pin' | null;
  sorting: boolean;
};
