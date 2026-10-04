import { describe, expect, it } from 'vitest';

import type { SpaceRow, SpacesRepository } from './spaces.repository.ts';
import { createSpacesService } from './spaces.service.ts';

const hub: SpaceRow = { id: 7, slug: 'hub', nameAr: 'هب', nameEn: null, areaId: 4 };

describe('the spaces service', () => {
  it('reads the summaries of the asked spaces from the repository, in one call', async () => {
    const asked: (readonly number[])[] = [];
    const repository: SpacesRepository = {
      findSummaries: (ids) => {
        asked.push(ids);
        return Promise.resolve([hub]);
      },
    };

    await expect(createSpacesService({ repository }).summariesFor([7, 8])).resolves.toEqual([hub]);
    expect(asked).toEqual([[7, 8]]);
  });
});
