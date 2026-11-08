import {
  MAP_PINS_CEILING,
  PUBLIC_ANNOUNCEMENTS_MAX,
  type DirectoryQuery,
  type DirectorySpace,
  type FavoriteSpace,
  type MapPin,
  type MapPins,
  type MapPinsQuery,
  type PriceRanges,
  type PublicSpace,
} from '@masaha/shared/directory';
import { gazaClockOf } from '@masaha/shared/core';
import { FAVORITES_MAX } from '@masaha/shared/favorites';
import type { HoursStatus, LiveStatus, PublicOccupancy } from '@masaha/shared/occupancy';
import type { Location, Price } from '@masaha/shared/spaces';

import { isVerified } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { AnnouncementsService } from '../announcements/index.ts';
import type { FavoritesService } from '../favorites/index.ts';
import type { AreaName, LookupsService } from '../lookups/index.ts';
import type { OccupancyService } from '../occupancy/index.ts';
import type { SpaceLinksService } from '../space-links/index.ts';
import type {
  ListedPublicSpace,
  PublicListingFilter,
  PublicListingService,
  PublicOrder,
  PublicSpaceService,
  SpacesService,
} from '../spaces/index.ts';
import { favoritesOrder } from './favoritesOrder.ts';

interface Dependencies {
  announcements: AnnouncementsService;
  favorites: FavoritesService;
  spaces: SpacesService;
  lookups: LookupsService;
  spaceLinks: SpaceLinksService;
  publicListing: PublicListingService;
  publicSpace: PublicSpaceService;
  occupancy: OccupancyService;
  /** The one clock (conventions §11): read once per answer, so its filter and its states agree. */
  now: () => Date;
}

/** A space's states as its card and its pin carry them. */
interface States {
  liveStatus: LiveStatus | null;
  hoursStatus: HoursStatus | null;
}

const NO_STATES: States = { liveStatus: null, hoursStatus: null };

type PricePeriod = Price['period'];

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
    case 'priceAsc':
    case 'priceDesc':
      // The schema takes a price order only with a period, which the filter's price reads.
      if (!query.period) throw AppError.validation({ sort: ['invalid_choice'] });
      return { by: 'price', direction: query.sort === 'priceAsc' ? 'asc' : 'desc' };
  }
}

function toDirectorySpace(
  space: ListedPublicSpace,
  area: AreaName,
  { liveStatus, hoursStatus }: States,
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
    // Only a list filtered by a period has a price: the one the filter kept.
    ...(space.priceAgorot !== null && { priceAgorot: space.priceAgorot }),
    cover: space.cover,
    liveStatus,
    hoursStatus,
  };
}

function toMapPin(space: ListedPublicSpace, { liveStatus, hoursStatus }: States): MapPin {
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
    hoursStatus,
  };
}

/**
 * The public directory (conventions §9, Composed reads): what anyone reads without signing in,
 * over the publicly listed spaces. Each filter on another module's value is resolved to ids first,
 * by its owner, in one query: the listed areas and the search's areas by `lookups`, the verified
 * spaces by `space-links`, and, for «مفتوحة الآن», the spaces under a closure in force by
 * `announcements` and those closed by hand by `occupancy`; `spaces` then filters by the hours,
 * searches, orders and pages (§5). The areas' and the amenities' names follow, one query each, and
 * the states of the spaces answered, set-based, from `occupancy`. Each answer reads the clock once.
 */
export function createDirectoryService({
  announcements,
  favorites,
  spaces,
  lookups,
  spaceLinks,
  publicListing,
  publicSpace,
  occupancy,
  now: clock,
}: Dependencies) {
  /** «مفتوحة الآن» at `at`: Gaza's time, and the spaces closed now whatever their hours say. */
  async function openAtOf(verifiedIds: readonly number[], at: Date) {
    const [closures, closedByHand] = await Promise.all([
      announcements.closedSpaceIdsAt(at),
      occupancy.closedByOverrideAmong(verifiedIds, at),
    ]);
    const { dayOfWeek, minute } = gazaClockOf(at);
    return { dayOfWeek, minute, exceptIds: [...new Set([...closures, ...closedByHand])] };
  }

  async function filterOf(query: Filters, at: Date): Promise<PublicListingFilter> {
    const [listedAreaIds, verifiedIds, areaMatches] = await Promise.all([
      lookups.listedAreaIds(),
      spaceLinks.verifiedSpaceIds(),
      query.q === undefined ? [] : lookups.areaMatches(query.q),
    ]);
    const { area } = query;
    return {
      areaIds: area ? listedAreaIds.filter((id) => area.includes(id)) : listedAreaIds,
      verifiedIds,
      verifiedOnly: query.verified,
      price: query.period && { period: query.period, min: query.priceMin, max: query.priceMax },
      studentPrices: query.studentPrices,
      openFriday: query.openFriday,
      openAt: query.openNow ? await openAtOf(verifiedIds, at) : undefined,
      evening: query.evening,
      search: query.q === undefined ? undefined : { q: query.q, areaMatches },
      bounds: query.bounds,
    };
  }

  /** The states of each listed space at `at`, from the week it was listed with. */
  function statesOf(rows: readonly ListedPublicSpace[], at: Date) {
    return occupancy.publicStatesFor(
      rows.map(({ id, isVerified, days }) => ({ id, verified: isVerified, week: days })),
      at,
    );
  }

  /** The listed spaces as the directory's cards: their areas' names and states, set-based. */
  async function cardsOf(rows: readonly ListedPublicSpace[], at: Date): Promise<DirectorySpace[]> {
    if (rows.length === 0) return [];
    const [areas, statuses] = await Promise.all([
      lookups.areaNamesFor([...new Set(rows.map(({ areaId }) => areaId))]),
      statesOf(rows, at),
    ]);
    const areaById = new Map(areas.map((area) => [area.id, area]));
    // Its area always exists (a foreign key).
    return rows.flatMap((space) => {
      const area = areaById.get(space.areaId);
      return area ? [toDirectorySpace(space, area, statuses.get(space.id) ?? NO_STATES)] : [];
    });
  }

  return {
    /** One page of the directory's list, and how many spaces pass its filters. */
    async list(query: DirectoryQuery): Promise<{ rows: DirectorySpace[]; total: number }> {
      const at = clock();
      const { rows, total } = await publicListing.page(
        await filterOf(query, at),
        orderOf(query),
        query,
      );
      return { rows: await cardsOf(rows, at), total };
    },

    /**
     * The user's favourites, whole (at most `FAVORITES_MAX`): the ids `favorites` records, newest
     * saved first; those the public listing lists as its cards, from the point nearest first when
     * one is given; the rest, which left the directory, by their names, soft-deleted ones
     * included, `listed: false`, after the listed ones when ordered from the point.
     */
    async favorites(userId: number, near?: Location): Promise<FavoriteSpace[]> {
      const saved = await favorites.of(userId);
      if (saved.length === 0) return [];
      const ids = saved.map(({ spaceId }) => spaceId);
      const [listedAreaIds, verifiedIds] = await Promise.all([
        lookups.listedAreaIds(),
        spaceLinks.verifiedSpaceIds(),
      ]);
      const { rows } = await publicListing.page(
        { areaIds: listedAreaIds, verifiedIds, onlyIds: ids },
        near ? { by: 'distance', from: near } : { by: 'updated' },
        { page: 1, limit: FAVORITES_MAX },
      );
      const cards = await cardsOf(rows, clock());
      const cardById = new Map(cards.map((card) => [card.id, card]));
      const left = ids.filter((id) => !cardById.has(id));
      const names = left.length === 0 ? [] : await spaces.namesWithDeleted(left);
      const nameById = new Map(names.map((name) => [name.id, name]));
      const savedAt = new Map(
        saved.map(({ spaceId, savedAt }) => [spaceId, savedAt.toISOString()]),
      );

      return favoritesOrder(ids, near ? cards.map(({ id }) => id) : null).flatMap(
        (id): FavoriteSpace[] => {
          const at = savedAt.get(id) ?? '';
          const card = cardById.get(id);
          if (card) return [{ listed: true, savedAt: at, space: card }];
          // A favourite's space always exists (a foreign key, cascading on delete).
          const name = nameById.get(id);
          return name
            ? [
                {
                  listed: false,
                  savedAt: at,
                  space: { id, nameEn: name.nameEn, nameAr: name.nameAr },
                },
              ]
            : [];
        },
      );
    },

    /**
     * Each period's lowest and highest general price over the publicly listed spaces whose prices
     * are shown, whatever the other filters: the range's hints. A period none prices is `null`.
     */
    async priceRanges(): Promise<PriceRanges> {
      const [areaIds, verifiedIds] = await Promise.all([
        lookups.listedAreaIds(),
        spaceLinks.verifiedSpaceIds(),
      ]);
      const rows = await publicListing.priceRanges({ areaIds, verifiedIds });
      const byPeriod = new Map(rows.map((row) => [row.period, row]));
      const range = (period: PricePeriod) => {
        const row = byPeriod.get(period);
        return row ? { minAgorot: row.min, maxAgorot: row.max } : null;
      };
      return { HOUR: range('HOUR'), DAY: range('DAY'), WEEK: range('WEEK'), MONTH: range('MONTH') };
    },

    /** The map's pins: every listed space that passes the filters, up to the ceiling. */
    async pins(query: MapPinsQuery): Promise<MapPins> {
      const at = clock();
      const { rows, truncated } = await publicListing.upTo(
        await filterOf(query, at),
        MAP_PINS_CEILING,
      );
      const statuses = await statesOf(rows, at);
      return {
        pins: rows.map((space) => toMapPin(space, statuses.get(space.id) ?? NO_STATES)),
        truncated,
      };
    },

    /**
     * A publicly listed space's live status and its state by its hours, and nothing else: never a
     * count or a capacity (ADR 0008). Anything not listed, an unknown slug included, is
     * `not_found`, as its page.
     */
    async occupancy(slug: string): Promise<PublicOccupancy> {
      const shown = await publicSpace.findShown(slug);
      if (!shown || !(await lookups.isActiveArea(shown.areaId))) {
        throw AppError.notFound(undefined, 'Space not found');
      }
      const verified = isVerified({ links: await spaceLinks.linksAt(shown.id) });
      const states = (await occupancy.publicStatesFor([{ id: shown.id, verified }], clock())).get(
        shown.id,
      );
      return { status: states?.liveStatus ?? null, hoursStatus: states?.hoursStatus ?? null };
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

      // Read after the space's share lock: an announcement is no fact group, and one posted between
      // the two reads shows on the next.
      const [[area], amenities, shownAnnouncements] = await Promise.all([
        lookups.areaNamesFor([view.areaId]),
        view.amenityIds.length === 0 ? [] : lookups.activeAmenitiesNamed(view.amenityIds),
        announcements.publicOf(view.id, PUBLIC_ANNOUNCEMENTS_MAX),
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
        announcements: shownAnnouncements.map(({ id, type, textAr, textEn, startsAt, endsAt }) => ({
          id,
          type,
          textAr,
          textEn,
          startsAt,
          endsAt,
        })),
      };
    },
  };
}

export type DirectoryService = ReturnType<typeof createDirectoryService>;
