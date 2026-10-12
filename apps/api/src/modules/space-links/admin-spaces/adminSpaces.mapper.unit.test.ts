import { describe, expect, it } from 'vitest';

import type { ListedSpace } from '../../spaces/index.ts';
import { toAdminSpaceRow } from './adminSpaces.mapper.ts';

const SPACE: ListedSpace = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: null,
  areaId: 4,
  isHidden: false,
  staleGroups: ['prices'],
  missingGroups: ['contacts'],
  lastUpdatedAt: new Date('2026-10-01T09:00:00Z'),
};
const AREA = { id: 4, nameAr: 'النصر', nameEn: 'An-Nasr' };
const AHMAD = { id: 2, name: 'Ahmad' };

describe('toAdminSpaceRow', () => {
  it('composes the space with its area and owners, verified while it has one', () => {
    expect(toAdminSpaceRow(SPACE, AREA, [AHMAD])).toEqual({
      id: 7,
      slug: 'focus-hub',
      nameEn: 'Focus Hub',
      nameAr: null,
      area: AREA,
      isVerified: true,
      isHidden: false,
      owners: [AHMAD],
      staleGroups: ['prices'],
      missingGroups: ['contacts'],
      lastUpdatedAt: '2026-10-01T09:00:00.000Z',
    });
  });

  it('is unverified without an owner', () => {
    expect(toAdminSpaceRow(SPACE, AREA, []).isVerified).toBe(false);
  });

  it('says a hidden space with an owner is both hidden and verified', () => {
    const row = toAdminSpaceRow({ ...SPACE, isHidden: true }, AREA, [AHMAD]);

    expect({ isHidden: row.isHidden, isVerified: row.isVerified }).toEqual({
      isHidden: true,
      isVerified: true,
    });
  });
});
