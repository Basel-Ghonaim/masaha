import type { SpaceReport } from '@masaha/shared/data-reports';

/** The report the decision sheet shows, and whose decision it sends: the owner's, of a space's. */
export type DecideTarget = { audience: 'owner'; spaceId: number; report: SpaceReport };
