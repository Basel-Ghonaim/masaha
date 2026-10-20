import type { ReactNode } from 'react';
import type { OwnersSlot } from './OwnersSlot';

/**
 * Where a space's editor works: the admin's dashboard, on the admin's routes, or an owner's space,
 * on the managed ones. It picks the editor's calls, its keys and what a write refreshes.
 */
export type EditorPlace = 'admin' | 'owner';

/**
 * The admin's editor: what it shows beside the sections, from other capabilities — the owners'
 * actions in its notice (`space-links`), the way to the platform's amenities list, and a verified
 * space's area and amenities named (`lookups`).
 */
export type AdminPlace = {
  kind: 'admin';
  ownerActions: OwnersSlot;
  amenitiesListLink: string;
  areaName: (areaId: number) => ReactNode;
  amenityNames: (ids: number[]) => ReactNode;
};

/** An owner's editor: the prices are edited on Packages & prices, which `pricesLink` leads to. */
export type OwnerPlace = { kind: 'owner'; pricesLink: string };
