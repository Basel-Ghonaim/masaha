import { describe, expect, it } from 'vitest';

import { toManagedSpace } from './space-links.mapper.ts';

describe('toManagedSpace', () => {
  it('joins the link’s role, the space’s slug and names, and its area’s names', () => {
    expect(
      toManagedSpace(
        { spaceId: 7, role: 'RECEPTION' },
        { id: 7, slug: 'hub', nameAr: 'هب', nameEn: 'Hub', areaId: 4 },
        { id: 4, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
      ),
    ).toEqual({
      spaceId: 7,
      role: 'RECEPTION',
      slug: 'hub',
      nameAr: 'هب',
      nameEn: 'Hub',
      area: { nameAr: 'الرمال', nameEn: 'Al-Rimal' },
    });
  });
});
