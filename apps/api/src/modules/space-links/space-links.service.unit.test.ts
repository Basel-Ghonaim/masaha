import { describe, expect, it } from 'vitest';

import type { AreaName, LookupsService } from '../lookups/index.ts';
import type { SpaceRow, SpacesService } from '../spaces/index.ts';
import type { ActiveLink, SpaceLinksRepository } from './space-links.repository.ts';
import { createSpaceLinksService } from './space-links.service.ts';

const SPACES: SpaceRow[] = [
  { id: 7, slug: 'hub', nameAr: 'هب', nameEn: 'Hub', areaId: 4 },
  { id: 3, slug: 'nook', nameAr: 'ركن', nameEn: null, areaId: 5 },
  { id: 9, slug: 'loft', nameAr: 'لوفت', nameEn: 'Loft', areaId: 5 },
];
const AREAS: AreaName[] = [
  { id: 4, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  { id: 5, nameAr: 'النصر', nameEn: 'An-Nasr' },
];

/** The service over fakes that know `SPACES` and `AREAS`, with a record of what each was asked. */
function setup(links: ActiveLink[]) {
  const calls: string[] = [];
  const repository: SpaceLinksRepository = {
    findActiveLinks: (userId) => {
      calls.push(`links:${String(userId)}`);
      return Promise.resolve(links);
    },
  };
  const spaces: SpacesService = {
    summariesFor: (ids) => {
      calls.push(`spaces:${ids.join(',')}`);
      return Promise.resolve(SPACES.filter(({ id }) => ids.includes(id)));
    },
  };
  const lookups: LookupsService = {
    areaNamesFor: (ids) => {
      calls.push(`areas:${ids.join(',')}`);
      return Promise.resolve(AREAS.filter(({ id }) => ids.includes(id)));
    },
  };
  return { service: createSpaceLinksService({ repository, spaces, lookups }), calls };
}

describe('mySpaces', () => {
  it('composes each link’s role with its own space and its own area, in the links’ order', async () => {
    const { service } = setup([
      { spaceId: 3, role: 'RECEPTION' },
      { spaceId: 7, role: 'OWNER' },
    ]);

    await expect(service.mySpaces(1)).resolves.toEqual([
      {
        spaceId: 3,
        role: 'RECEPTION',
        slug: 'nook',
        nameAr: 'ركن',
        nameEn: null,
        area: { nameAr: 'النصر', nameEn: 'An-Nasr' },
      },
      {
        spaceId: 7,
        role: 'OWNER',
        slug: 'hub',
        nameAr: 'هب',
        nameEn: 'Hub',
        area: { nameAr: 'الرمال', nameEn: 'Al-Rimal' },
      },
    ]);
  });

  it('asks each module once, for all the links, with each area asked once', async () => {
    const { service, calls } = setup([
      { spaceId: 7, role: 'OWNER' },
      { spaceId: 3, role: 'OWNER' },
      { spaceId: 9, role: 'RECEPTION' },
    ]);

    await service.mySpaces(1);

    expect(calls).toEqual(['links:1', 'spaces:7,3,9', 'areas:4,5']);
  });

  it('leaves out a link whose space has no summary, as a soft-deleted space has none', async () => {
    const { service } = setup([
      { spaceId: 42, role: 'OWNER' },
      { spaceId: 9, role: 'RECEPTION' },
    ]);

    const mine = await service.mySpaces(1);

    expect(mine.map(({ spaceId }) => spaceId)).toEqual([9]);
  });

  it('answers an empty list without asking spaces or lookups when the user has no links', async () => {
    const { service, calls } = setup([]);

    await expect(service.mySpaces(1)).resolves.toEqual([]);
    expect(calls).toEqual(['links:1']);
  });
});
