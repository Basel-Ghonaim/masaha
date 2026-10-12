import type { AdminSpaceRow } from '@masaha/shared/space-links';

/**
 * The space a row's menu acts on, as the admin's list gives it: its id, its names and whether it is
 * hidden.
 */
export type SpaceRef = Pick<AdminSpaceRow, 'id' | 'nameEn' | 'nameAr' | 'isHidden'>;
