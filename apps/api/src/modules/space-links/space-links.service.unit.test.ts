import { describe, expect, it } from 'vitest';

import type { AreaName, LookupsService } from '../lookups/index.ts';
import type { SpaceRow, SpacesService } from '../spaces/index.ts';
import type { ActiveLink, SpaceLinksRepository } from './space-links.repository.ts';
import { createSpaceLinksService } from './space-links.service.ts';

const SPACES: SpaceRow[] = [
  { id: 7, slug: 'hub', nameAr: 'هب', nameEn: 'Hub', areaId: 4 },
  { id: 3, slug: 'nook', nameAr: null, nameEn: 'Nook', areaId: 5 },
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
    // The links' user is 1 throughout: what these fakes know of a link is its space and role.
    findLinksAt: (spaceId) =>
      Promise.resolve(
        links
          .filter((link) => link.spaceId === spaceId)
          .map(({ role }) => ({ userId: 1, role, deactivatedAt: null })),
      ),
    findVerifiedSpaceIds: () => Promise.reject(new Error('not asked here')),
    findOwnerLinks: () => Promise.reject(new Error('not asked here')),
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
    areaIdsOf: () => Promise.reject(new Error('not asked here')),
    isActiveArea: () => Promise.reject(new Error('not asked here')),
  };
  return { service: createSpaceLinksService({ repository, spaces, lookups }), calls };
}

describe('linksAt', () => {
  it('answers the links of a space that is not deleted', async () => {
    const { service } = setup([{ spaceId: 7, role: 'OWNER' }]);

    await expect(service.linksAt(7)).resolves.toEqual([
      { userId: 1, role: 'OWNER', deactivatedAt: null },
    ]);
  });

  it('answers no links for a space with no summary, as a soft-deleted space has none', async () => {
    const { service } = setup([{ spaceId: 42, role: 'OWNER' }]);

    await expect(service.linksAt(42)).resolves.toEqual([]);
  });
});

describe('activeLinksFor', () => {
  it('keeps the links in their order, leaving out one whose space has no summary', async () => {
    const { service, calls } = setup([
      { spaceId: 9, role: 'RECEPTION' },
      { spaceId: 42, role: 'OWNER' },
      { spaceId: 7, role: 'OWNER' },
    ]);

    await expect(service.activeLinksFor(1)).resolves.toEqual([
      { spaceId: 9, role: 'RECEPTION' },
      { spaceId: 7, role: 'OWNER' },
    ]);
    expect(calls).toEqual(['links:1', 'spaces:9,42,7']);
  });

  it('answers no links without asking spaces when the user has none', async () => {
    const { service, calls } = setup([]);

    await expect(service.activeLinksFor(1)).resolves.toEqual([]);
    expect(calls).toEqual(['links:1']);
  });
});

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
        nameAr: null,
        nameEn: 'Nook',
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
