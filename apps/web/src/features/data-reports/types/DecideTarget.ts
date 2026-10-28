import type { AdminReport, SpaceReport } from '@masaha/shared/data-reports';

/**
 * The report the decision sheet shows, and whose decision it sends: the owner's, of a space's, or
 * the admin's, of any space's.
 */
export type DecideTarget =
  | { audience: 'owner'; spaceId: number; report: SpaceReport }
  | { audience: 'admin'; report: AdminReport };
