import type { AdminSpaceRow } from '@masaha/shared/space-links';

/**
 * The space a row's actions act on, as the admin's list gives it: its id, its names, whether it is
 * hidden, and when it was deleted, which decides the actions it is given.
 */
export type SpaceRef = Pick<AdminSpaceRow, 'id' | 'nameEn' | 'nameAr' | 'isHidden' | 'deletedAt'>;
