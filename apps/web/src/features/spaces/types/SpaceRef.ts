import type { AdminSpaceRow } from '@masaha/shared/space-links';

/** The space a row's menu acts on, as the admin's list gives it: its id, its names and its state. */
export type SpaceRef = Pick<AdminSpaceRow, 'id' | 'nameEn' | 'nameAr' | 'state'>;
