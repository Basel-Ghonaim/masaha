import {
  MAP_PINS_CEILING,
  type DirectoryQuery,
  type DirectorySpace,
  type MapPin,
  type MapPins,
  type MapPinsQuery,
  type PublicSpace,
} from '@masaha/shared/directory';
import type { LiveStatus, PublicOccupancy } from '@masaha/shared/occupancy';

import { isVerified } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { AreaName, LookupsService } from '../lookups/index.ts';
import type { OccupancyService } from '../occupancy/index.ts';
import type { SpaceLinksService } from '../space-links/index.ts';
import type {
  ListedPublicSpace,
  PublicListingFilter,
  PublicListingService,
  PublicOrder,
  PublicSpaceService,
} from '../spaces/index.ts';

interface Dependencies {
  lookups: LookupsService;
  spaceLinks: SpaceLinksService;
  publicListing: PublicListingService;
  publicSpace: PublicSpaceService;
  occupancy: OccupancyService;
}

/** The filters the list and the map share. */
type Filters = Omit<MapPinsQuery, 'bounds'> & { bounds?: MapPinsQuery['bounds'] };

function orderOf(query: DirectoryQuery): PublicOrder {
  switch (query.sort) {
    case 'name':
      return { by: 'name', lang: query.lang };
    case 'relevance':
      return { by: 'relevance' };
    case 'distance':
      // The schema takes `distance` only with the point, and the point only with it.
      if (!query.near) throw AppError.validation({ near: ['required'] });
      return { by: 'distance', from: query.near };
    case 'updated':
      return { by: 'updated' };
  }
}

function toDirectorySpace(
  space: ListedPublicSpace,
  area: AreaName,
  liveStatus: LiveStatus | null,
): DirectorySpace {
  return {
    id: space.id,
    slug: space.slug,
    nameEn: space.nameEn,
    nameAr: space.nameAr,
    area: { id: area.id, nameAr: area.nameAr, nameEn: area.nameEn },
    isVerified: space.isVerified,
    days: space.days,
    ...(space.distanceMeters !== null && { distanceMeters: space.distanceMeters }),
    cover: space.cover,
    liveStatus,
  };
}

function toMapPin(space: ListedPublicSpace, liveStatus: LiveStatus | null): MapPin {
  return {
    id: space.id,
    slug: space.slug,
    nameEn: space.nameEn,
    nameAr: space.nameAr,
    areaId: space.areaId,
    location: space.location,
    isVerified: space.isVerified,
    days: space.days,
    cover: space.cover,
    liveStatus,
  };
}

/**
 * The public directory (conventions §9, Composed reads): what anyone reads without signing in,
 * over the publicly listed spaces. Each filter on another module's value is resolved to ids first,
 * by its owner, in one query: the listed areas and the search's areas by `lookups`, the verified
 * spaces by `space-links`, and the spaces available now by `occupancy`; `spaces` then filters,
 * searches, orders and pages (§5). The areas' and the amenities' names follow, one query each, and
 * the live status of the spaces answered, set-based, from `occupancy`.
 */
export function createDirectoryService({
  lookups,
  spaceLinks,
  publicListing,
  publicSpace,
  occupancy,
}: Dependencies) {
  async function filterOf(query: Filters): Promise<PublicListingFilter> {
    const [listedAreaIds, verifiedIds, areaMatches] = await Promise.all([
      lookups.listedAreaIds(),
      spaceLinks.verifiedSpaceIds(),
      query.q === undefined ? [] : lookups.areaMatches(query.q),
    ]);
    const { area } = query;
    return {
      areaIds: area ? listedAreaIds.filter((id) => area.includes(id)) : listedAreaIds,
      verifiedIds,
      // Only a verified space has a live state, so only those can be available.
      onlyIds: query.availableNow ? await occupancy.availableAmong(verifiedIds) : undefined,
      verifiedOnly: query.verified,
      price: query.period && { period: query.period, min: query.priceMin, max: query.priceMax },
      studentPrices: query.studentPrices,
      openFriday: query.openFriday,
      search: query.q === undefined ? undefined : { q: query.q, areaMatches },
      bounds: query.bounds,
    };
  }

  /** The live status of each listed space, from the week it was listed with. */
  function liveStatusesOf(rows: readonly ListedPublicSpace[]) {
    return occupancy.liveStatusFor(
      rows.map(({ id, isVerified, days }) => ({ id, verified: isVerified, week: days })),
    );
  }

  return {
    /** One page of the directory's list, and how many spaces pass its filters. */
    async list(query: DirectoryQuery): Promise<{ rows: DirectorySpace[]; total: number }> {
      const { rows, total } = await publicListing.page(
        await filterOf(query),
        orderOf(query),
        query,
      );
      if (rows.length === 0) return { rows: [], total };
      const [areas, statuses] = await Promise.all([
        lookups.areaNamesFor([...new Set(rows.map(({ areaId }) => areaId))]),
        liveStatusesOf(rows),
      ]);
      const areaById = new Map(areas.map((area) => [area.id, area]));
      return {
        // Its area always exists (a foreign key).
        rows: rows.flatMap((space) => {
          const area = areaById.get(space.areaId);
          return area ? [toDirectorySpace(space, area, statuses.get(space.id) ?? null)] : [];
        }),
        total,
      };
    },

    /** The map's pins: every listed space that passes the filters, up to the ceiling. */
    async pins(query: MapPinsQuery): Promise<MapPins> {
      const { rows, truncated } = await publicListing.upTo(await filterOf(query), MAP_PINS_CEILING);
      const statuses = await liveStatusesOf(rows);
      return {
        pins: rows.map((space) => toMapPin(space, statuses.get(space.id) ?? null)),
        truncated,
      };
    },

    /**
     * A publicly listed space's live status, and nothing else: never a count or a capacity
     * (ADR 0008). Anything not listed, an unknown slug included, is `not_found`, as its page.
     */
    async occupancy(slug: string): Promise<PublicOccupancy> {
      const shown = await publicSpace.findShown(slug);
      if (!shown || !(await lookups.isActiveArea(shown.areaId))) {
        throw AppError.notFound(undefined, 'Space not found');
      }
      const verified = isVerified({ links: await spaceLinks.linksAt(shown.id) });
      const statuses = await occupancy.liveStatusFor([{ id: shown.id, verified }]);
      return { status: statuses.get(shown.id) ?? null };
    },

    /**
     * A publicly listed space's page; anything else, an unknown slug included, is `not_found`
     * (data-model › Publicly listed). Whether it is verified is read from its links under the
     * space's lock, with its facts, so an owner linked or unlinked meanwhile never shows prices
     * the rule would hide.
     */
    async page(slug: string): Promise<PublicSpace> {
      const shown = await publicSpace.findShown(slug);
      if (!shown || !(await lookups.isActiveArea(shown.areaId))) {
        throw AppError.notFound(undefined, 'Space not found');
      }
      const view = await publicSpace.read(shown.id, async (tx) =>
        isVerified({ links: await spaceLinks.linksAt(shown.id, tx) }),
      );
      if (!view) throw AppError.notFound(undefined, 'Space not found');

      const [[area], amenities] = await Promise.all([
        lookups.areaNamesFor([view.areaId]),
        view.amenityIds.length === 0 ? [] : lookups.activeAmenitiesNamed(view.amenityIds),
      ]);
      if (!area) throw AppError.notFound(undefined, 'Space not found');
      return {
        id: view.id,
        slug: view.slug,
        nameEn: view.nameEn,
        nameAr: view.nameAr,
        descriptionAr: view.descriptionAr,
        descriptionEn: view.descriptionEn,
        area: { id: area.id, nameAr: area.nameAr, nameEn: area.nameEn },
        addressAr: view.addressAr,
        addressEn: view.addressEn,
        landmarkAr: view.landmarkAr,
        landmarkEn: view.landmarkEn,
        location: view.location,
        isVerified: view.isVerified,
        hours: view.hours,
        prices: view.prices,
        amenities: [
          ...amenities.map(({ nameAr, nameEn, icon }) => ({ nameAr, nameEn, icon })),
          ...view.ownAmenities.map(({ nameAr, nameEn }) => ({ nameAr, nameEn, icon: null })),
        ],
        contacts: view.contacts,
        updatedAt: view.updatedAt,
        staleGroups: view.staleGroups,
        photos: view.photos,
      };
    },
  };
}

export type DirectoryService = ReturnType<typeof createDirectoryService>;
