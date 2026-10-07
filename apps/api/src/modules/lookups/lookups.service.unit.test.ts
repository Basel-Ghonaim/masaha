import { describe, expect, it } from 'vitest';

import type { AreaName, LookupsRepository } from './lookups.repository.ts';
import { createLookupsService } from './lookups.service.ts';

const rimal: AreaName = { id: 4, nameAr: 'الرمال', nameEn: 'Al-Rimal' };

describe('the lookups service', () => {
  it('reads the names of the asked areas from the repository, in one call', async () => {
    const asked: (readonly number[])[] = [];
    const repository: LookupsRepository = {
      findAreaNames: (ids) => {
        asked.push(ids);
        return Promise.resolve([rimal]);
      },
      findAreaIdsOf: () => Promise.reject(new Error('not asked here')),
      isActiveArea: () => Promise.reject(new Error('not asked here')),
      findActiveAmenityIds: () => Promise.reject(new Error('not asked here')),
    };

    await expect(createLookupsService({ repository }).areaNamesFor([4, 9])).resolves.toEqual([
      rimal,
    ]);
    expect(asked).toEqual([[4, 9]]);
  });
});
