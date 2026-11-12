import type { OwnersSlot } from './OwnersSlot';

/**
 * Where a space's profile works: the admin's dashboard, on the admin's routes, or an owner's space,
 * on the managed ones. It picks the editor's calls, its keys and what a write refreshes.
 */
export type EditorPlace = 'admin' | 'owner';

/**
 * The admin's profile: what it shows from other capabilities — the owners' actions (`space-links`),
 * in the verified notice or, for an unverified space, in the header (DI-3) — the way to the
 * platform's amenities list, and to the space's reports.
 */
export type AdminPlace = {
  kind: 'admin';
  ownerActions: OwnersSlot;
  amenitiesListLink: string;
  /** The admin's reports of the space, where a fact its owner keeps is corrected (G26.8). */
  reportsLink: (spaceId: number) => string;
};

/**
 * An owner's profile: the way to a closure announcement (DI-5), and the shifts the space's packages
 * use, which only the owner may read (SD5), so a shift a package uses cannot be removed.
 */
export type OwnerPlace = { kind: 'owner'; closureLink: string; packageShifts: readonly number[] };
