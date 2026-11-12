import type { Language } from '@masaha/shared/core';
import type { Location, Price } from '@masaha/shared/spaces';

import { prisma } from '../../../db/index.ts';
import { Prisma, type PrismaClient } from '../../../generated/prisma/client.ts';

// The public directory's reads, in one query each over `spaces` and its facts, with the filters
// another module owns resolved to ids first (conventions §5): every filter applies before the page
// is cut. Raw SQL, because the order and the search's score are computed: the similarity is the
// database's `masaha_search_score`, the one rule the stored names and the query go through.

/** The least score that counts as a match: pg_trgm's own default, about one letter wrong. */
const SEARCH_THRESHOLD = 0.3;

/** Friday, as `space_hours` numbers the days (0 = Sunday). */
const FRIDAY = 5;

const EARTH_RADIUS_METRES = 6_371_000;

/** What the public may filter the listed spaces by. */
export interface PublicFilter {
  /** The areas the spaces may be in: the listed ones, narrowed by the filter. */
  areaIds: readonly number[];
  /** Every verified space's id, from `space-links`. */
  verifiedIds: readonly number[];
  /** Only these spaces: the favourites, resolved to ids. */
  onlyIds?: readonly number[] | undefined;
  verifiedOnly?: boolean | undefined;
  /**
   * A general price of this period, within the bounds, inclusive: the space's lowest such price is
   * its card's price and the price order's key.
   */
  price?: { period: Price['period']; min?: number | undefined; max?: number | undefined };
  studentPrices?: boolean | undefined;
  openFriday?: boolean | undefined;
  /**
   * Open now by its hours, at this time on Gaza's clock (`openRangeAt`'s comparisons), leaving out
   * the spaces another module closes now: a closure in force, a verified space's override to
   * `CLOSED`.
   */
  openAt?: { dayOfWeek: number; minute: number; exceptIds: readonly number[] } | undefined;
  /** «مفتوحة مساءً»: its owner declares it works in the evening (E7), whatever its week says. */
  evening?: boolean | undefined;
  /**
   * The women's hall's id, resolved by `lookups` from its key while it is active; `null` or none:
   * no space has it. Each space answers whether it has it, and `womensHall` keeps only those that do.
   */
  womensHallId?: number | null | undefined;
  /** «قاعة للنساء»: only the spaces that have the women's hall; none while it has no id. */
  womensHall?: boolean | undefined;
  /** The search, with how well it matches each listed area's names. */
  search?: { q: string; areaMatches: readonly { id: number; score: number }[] } | undefined;
  /** The map's viewport. */
  bounds?: { south: number; west: number; north: number; east: number } | undefined;
  /** Before it, prices are stale: an unverified space's are then hidden, and found by no filter. */
  pricesStaleBefore: Date;
}

/** The orders of the public list; each ends with the id, so ties keep one order across pages. */
export type PublicOrder =
  | { by: 'updated' }
  | { by: 'name'; lang: Language }
  | { by: 'distance'; from: Location }
  | { by: 'relevance' }
  /** By the filter's price (`price`), which this order needs. */
  | { by: 'price'; direction: 'asc' | 'desc' };

export interface PublicSpaceRecord {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  areaId: number;
  lat: number;
  lng: number;
  isVerified: boolean;
  /** Its owner declares it works in the evening. */
  worksEvenings: boolean;
  /** It has the women's hall. */
  womensHall: boolean;
  /** In metres, straight-line, only when ordered by distance. */
  distance: number | null;
  /** In agorot: the lowest general price of the filter's period within its bounds; only with it. */
  price: number | null;
}

/** Each period's lowest and highest general price, in agorot, over the spaces whose are shown. */
export interface PriceRangeRecord {
  period: Price['period'];
  min: number;
  max: number;
}

const { sql, join, empty } = Prisma;

/** The great-circle distance in metres from `from` to the space (the haversine formula). */
function distanceFrom({ lat, lng }: Location): Prisma.Sql {
  return sql`(2 * ${EARTH_RADIUS_METRES}::float8 * asin(sqrt(
    power(sin(radians(s.lat - ${lat}::float8) / 2), 2)
    + cos(radians(${lat}::float8)) * cos(radians(s.lat))
      * power(sin(radians(s.lng - ${lng}::float8) / 2), 2))))`;
}

/** Whether the space is verified: its id among the verified ones. */
const verifiedOf = (filter: Pick<PublicFilter, 'verifiedIds'>) =>
  sql`(s.id = ANY(${[...filter.verifiedIds]}::int[]))`;

/** The rule of `pricesHidden`, in the query: a verified space's prices, or fresh ones. */
const pricesShownOf = (filter: Pick<PublicFilter, 'verifiedIds' | 'pricesStaleBefore'>) =>
  sql`(${verifiedOf(filter)} OR s.prices_updated_at >= ${filter.pricesStaleBefore})`;

/** Whether the space has the women's hall: never while it has no id (retired or missing). */
const womensHallOf = ({ womensHallId }: Pick<PublicFilter, 'womensHallId'>) =>
  womensHallId === undefined || womensHallId === null
    ? sql`false`
    : sql`EXISTS (SELECT 1 FROM space_amenities sa
        WHERE sa.space_id = s.id AND sa.amenity_id = ${womensHallId})`;

/** Publicly listed: not deleted, not hidden, in a listed area (data-model › Derived values). */
const listedConditions = (filter: Pick<PublicFilter, 'areaIds'>) => [
  sql`s.deleted_at IS NULL`,
  sql`NOT s.is_hidden`,
  sql`s.area_id = ANY(${[...filter.areaIds]}::int[])`,
];

/**
 * The listed spaces that pass the filter, with what each order needs. With a price filter, each
 * space's lowest general price of the period within the bounds is one lateral `min()`: the space
 * passes when it has one and its prices are shown, and it is the card's price and the price order's
 * key, so the three never disagree.
 */
function listed(filter: PublicFilter, from?: Location): Prisma.Sql {
  const verified = verifiedOf(filter);
  const pricesShown = pricesShownOf(filter);
  const conditions = listedConditions(filter);
  if (filter.verifiedOnly) conditions.push(verified);
  if (filter.onlyIds) conditions.push(sql`s.id = ANY(${[...filter.onlyIds]}::int[])`);
  let priceJoin = empty;
  if (filter.price) {
    const { period, min, max } = filter.price;
    priceJoin = sql`CROSS JOIN LATERAL (
      SELECT min(p.amount_agorot) AS amount FROM space_prices p
      WHERE p.space_id = s.id AND p.audience = 'GENERAL' AND p.period = ${period}::"PricePeriod"
        ${min === undefined ? empty : sql`AND p.amount_agorot >= ${min}`}
        ${max === undefined ? empty : sql`AND p.amount_agorot <= ${max}`}) pr`;
    conditions.push(sql`${pricesShown} AND pr.amount IS NOT NULL`);
  }
  if (filter.studentPrices) {
    conditions.push(sql`${pricesShown} AND EXISTS (
      SELECT 1 FROM space_prices p WHERE p.space_id = s.id AND p.audience = 'STUDENT')`);
  }
  if (filter.openFriday) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM space_hours h
      WHERE h.space_id = s.id AND h.day_of_week = ${FRIDAY} AND NOT h.is_closed)`);
  }
  if (filter.openAt) {
    const { dayOfWeek, minute, exceptIds } = filter.openAt;
    conditions.push(sql`EXISTS (
      SELECT 1 FROM space_hours h
      WHERE h.space_id = s.id AND h.day_of_week = ${dayOfWeek} AND NOT h.is_closed
        AND h.opens_minute <= ${minute} AND ${minute} < h.closes_minute)
      AND NOT (s.id = ANY(${[...exceptIds]}::int[]))`);
  }
  if (filter.evening) conditions.push(sql`s.works_evenings`);
  if (filter.womensHall) conditions.push(womensHallOf(filter));
  if (filter.bounds) {
    const { south, west, north, east } = filter.bounds;
    conditions.push(sql`s.lat BETWEEN ${south}::float8 AND ${north}::float8
      AND s.lng BETWEEN ${west}::float8 AND ${east}::float8`);
  }

  const { search } = filter;
  const score = search
    ? sql`GREATEST(masaha_search_score(${search.q}, s.name_en),
                   masaha_search_score(${search.q}, s.name_ar),
                   COALESCE(m.score, 0))`
    : sql`NULL::real`;
  const areaMatches = search
    ? sql`LEFT JOIN unnest(${search.areaMatches.map(({ id }) => id)}::int[],
                           ${search.areaMatches.map(({ score: value }) => value)}::float8[])
            AS m(area_id, score) ON m.area_id = s.area_id`
    : empty;

  return sql`
    SELECT s.id, s.slug, s.name_en, s.name_ar, s.area_id, s.lat, s.lng, s.works_evenings,
      ${womensHallOf(filter)} AS womens_hall,
      GREATEST(s.profile_updated_at, s.hours_updated_at, s.prices_updated_at,
               s.amenities_updated_at, s.contacts_updated_at) AS last_updated,
      ${verified} AS is_verified,
      ${score} AS score,
      ${from ? distanceFrom(from) : sql`NULL::float8`} AS distance,
      ${filter.price ? sql`pr.amount` : sql`NULL::int`} AS price
    FROM spaces s ${areaMatches} ${priceJoin}
    WHERE ${join(conditions, ' AND ')}`;
}

/** The search's own filter: a space matches when its best score reaches the threshold. */
function matching(filter: PublicFilter): Prisma.Sql {
  return filter.search ? sql`WHERE score >= ${SEARCH_THRESHOLD}` : empty;
}

function orderOf(order: PublicOrder): Prisma.Sql {
  switch (order.by) {
    case 'updated':
      return sql`last_updated DESC, id`;
    case 'name':
      // Each language's own collation: Arabic's puts Arabic names before Latin ones.
      return order.lang === 'ar'
        ? sql`COALESCE(name_ar, name_en) COLLATE "ar-x-icu", id`
        : sql`name_en COLLATE "en-x-icu", id`;
    case 'distance':
      return sql`distance, id`;
    case 'relevance':
      return sql`score DESC, id`;
    case 'price':
      // Equal prices end by the id ascending in both directions, as every order does.
      return order.direction === 'asc' ? sql`price ASC, id` : sql`price DESC, id`;
  }
}

interface Row {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string | null;
  area_id: number;
  lat: number;
  lng: number;
  is_verified: boolean;
  works_evenings: boolean;
  womens_hall: boolean;
  distance: number | null;
  price: number | null;
}

function toRecord(row: Row): PublicSpaceRecord {
  return {
    id: row.id,
    slug: row.slug,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    areaId: row.area_id,
    lat: row.lat,
    lng: row.lng,
    isVerified: row.is_verified,
    worksEvenings: row.works_evenings,
    womensHall: row.womens_hall,
    distance: row.distance,
    price: row.price,
  };
}

export function createPublicListingRepository(db: PrismaClient = prisma) {
  return {
    /**
     * One page of the listed spaces that pass the filter, in the order, and how many pass it in
     * all. The two queries run in parallel (conventions §5).
     */
    async findPage(
      filter: PublicFilter,
      order: PublicOrder,
      { skip, take }: { skip: number; take: number },
    ): Promise<{ rows: PublicSpaceRecord[]; total: number }> {
      const spaces = listed(filter, order.by === 'distance' ? order.from : undefined);
      const [rows, [count]] = await Promise.all([
        db.$queryRaw<Row[]>`
          SELECT id, slug, name_en, name_ar, area_id, lat, lng, is_verified, works_evenings,
            womens_hall, distance, price
          FROM (${spaces}) listed ${matching(filter)}
          ORDER BY ${orderOf(order)}
          LIMIT ${take} OFFSET ${skip}`,
        db.$queryRaw<{ total: number }[]>`
          SELECT count(*)::int AS total FROM (${spaces}) listed ${matching(filter)}`,
      ]);
      return { rows: rows.map(toRecord), total: count?.total ?? 0 };
    },

    /** The first `limit` listed spaces that pass the filter, by id. */
    async findFirst(filter: PublicFilter, limit: number): Promise<PublicSpaceRecord[]> {
      const rows = await db.$queryRaw<Row[]>`
        SELECT id, slug, name_en, name_ar, area_id, lat, lng, is_verified, works_evenings,
          womens_hall, distance, price
        FROM (${listed(filter)}) listed ${matching(filter)}
        ORDER BY id
        LIMIT ${limit}`;
      return rows.map(toRecord);
    },

    /**
     * Each period's lowest and highest general price over the listed spaces whose prices are shown,
     * in one grouped query; a period no such space prices has no row.
     */
    async priceRanges(
      filter: Pick<PublicFilter, 'areaIds' | 'verifiedIds' | 'pricesStaleBefore'>,
    ): Promise<PriceRangeRecord[]> {
      const conditions = [...listedConditions(filter), pricesShownOf(filter)];
      const rows = await db.$queryRaw<{ period: Price['period']; min: number; max: number }[]>`
        SELECT p.period::text AS period, min(p.amount_agorot)::int AS min,
          max(p.amount_agorot)::int AS max
        FROM space_prices p JOIN spaces s ON s.id = p.space_id
        WHERE p.audience = 'GENERAL' AND ${join(conditions, ' AND ')}
        GROUP BY p.period`;
      return rows;
    },
  };
}
