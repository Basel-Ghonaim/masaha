import { z } from 'zod';

import { LANGUAGES, paginationQuerySchema, textSchema } from '../core/index.ts';
import {
  isInGazaStrip,
  PRICE_MAX_AGOROT,
  PRICE_PERIODS,
  SPACE_NAME_MAX_LENGTH,
} from '../spaces/index.ts';

// The public directory's reads (docs/api/api-contract.md §5, Directory (public)).

/** The most areas one filter names. */
export const DIRECTORY_AREAS_MAX = 50;

/** The most pins the map's read answers; past it, the first ones by id, marked truncated. */
export const MAP_PINS_CEILING = 1000;

/**
 * The request header that carries the device's location, and only to sort by distance: a header,
 * never the query, so no URL a host or a proxy logs holds it (docs/backend/security.md › Location).
 */
export const NEAR_HEADER = 'Masaha-Near';

/** The most decimals a coordinate of `near` may have: the device rounds to about 110 m. */
export const NEAR_DECIMALS = 3;

/**
 * The list's orders: the latest update first; by name in the interface's language; nearest first,
 * from `near`; and best match first, the default when `q` is given.
 */
export const DIRECTORY_SORTS = ['updated', 'name', 'distance', 'relevance'] as const;

export type DirectorySort = (typeof DIRECTORY_SORTS)[number];

// The largest id an Int column holds.
const ID = /^[1-9]\d{0,9}$/;
const MAX_ID = 2_147_483_647;

// What search removes before it compares (the database's `masaha_search_text`): a `q` with nothing
// else has nothing to match, so it is refused rather than matching every space.
const NOT_SEARCHABLE = /^[\s\u064B-\u065F\u0670\u0640]*$/u;

/** `area=3,7`: a comma list of area ids, each once. */
const areaList = z
  .string()
  .refine((text) => text.split(',').every((part) => ID.test(part) && Number(part) <= MAX_ID), {
    params: { code: 'invalid_format' },
  })
  .transform((text) => [...new Set(text.split(',').map(Number))])
  .pipe(z.array(z.number()).max(DIRECTORY_AREAS_MAX));

const amount = z.coerce.number().int().min(1).max(PRICE_MAX_AGOROT);

/**
 * Part of a name or of an area's name, in either language; refused when it holds nothing to match.
 * Spaces alone are trimmed to nothing, which is `too_short` only, as for every text.
 */
const searchText = textSchema(1, SPACE_NAME_MAX_LENGTH).refine(
  (text) => text === '' || !NOT_SEARCHABLE.test(text),
  { params: { code: 'invalid_format' } },
);

const COORDINATE = `-?\\d{1,3}(?:\\.\\d{1,${String(NEAR_DECIMALS)}})?`;
const NEAR = new RegExp(`^(${COORDINATE})\\s*,\\s*(${COORDINATE})$`);

/**
 * `lat,lng`, each with at most three decimals, inside the Gaza Strip's box: a finer point is
 * refused, so a client that forgets to round fails rather than sending where someone is.
 */
const nearPoint = z
  .string()
  .trim()
  .regex(NEAR)
  .transform((text) => {
    const [, lat, lng] = NEAR.exec(text) ?? [];
    return { lat: Number(lat), lng: Number(lng) };
  })
  .refine(isInGazaStrip, { params: { code: 'out_of_range' } });

/** What the list and the map filter by alike. */
const filters = {
  area: areaList.optional(),
  period: z.enum(PRICE_PERIODS).optional(),
  priceMin: amount.optional(),
  priceMax: amount.optional(),
  studentPrices: z.stringbool().optional(),
  openFriday: z.stringbool().optional(),
  verified: z.stringbool().optional(),
  q: searchText.optional(),
};

interface FilterValues {
  period?: string | undefined;
  priceMin?: number | undefined;
  priceMax?: number | undefined;
}

/** A price bound needs its period, and the lower one may not pass the upper. */
function checkPrice({ period, priceMin, priceMax }: FilterValues, ctx: z.RefinementCtx) {
  if (period === undefined && (priceMin !== undefined || priceMax !== undefined)) {
    ctx.addIssue({ code: 'custom', path: ['period'], params: { code: 'required' } });
  }
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    ctx.addIssue({ code: 'custom', path: ['priceMax'], params: { code: 'out_of_range' } });
  }
}

/**
 * The directory's list: the filters, the order, the interface's language (for the order by name)
 * and the page; `near` is the `Masaha-Near` header's point, read with the query. `sort` defaults to
 * `relevance` with `q` and to `updated` without; `distance` needs `near`, and `near` is taken only
 * with it.
 */
export const directoryQuerySchema = paginationQuerySchema
  .extend({
    ...filters,
    sort: z.enum(DIRECTORY_SORTS).optional(),
    lang: z.enum(LANGUAGES).default('ar'),
    near: nearPoint.optional(),
  })
  .superRefine((query, ctx) => {
    checkPrice(query, ctx);
    if (query.sort === 'relevance' && query.q === undefined) {
      ctx.addIssue({ code: 'custom', path: ['sort'], params: { code: 'invalid_choice' } });
    }
    if (query.sort === 'distance' && query.near === undefined) {
      ctx.addIssue({ code: 'custom', path: ['near'], params: { code: 'required' } });
    }
    if (query.sort !== 'distance' && query.near !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['near'], params: { code: 'invalid_choice' } });
    }
  })
  .transform(({ sort, ...query }) => ({
    ...query,
    sort: sort ?? (query.q === undefined ? 'updated' : 'relevance'),
  }));

export type DirectoryQuery = z.output<typeof directoryQuerySchema>;

/** `south,west,north,east`: the map's viewport, south below north and west before east. */
const boundsBox = z
  .string()
  .transform((text) => text.split(',').map((part) => (part.trim() === '' ? NaN : Number(part))))
  .refine(
    (parts) =>
      parts.length === 4 &&
      parts.every(Number.isFinite) &&
      (parts[0] as number) < (parts[2] as number) &&
      (parts[1] as number) < (parts[3] as number),
    { params: { code: 'invalid_format' } },
  )
  .transform(([south, west, north, east]) => ({
    south: south as number,
    west: west as number,
    north: north as number,
    east: east as number,
  }));

/** The map's pins: the list's filters, the whole set, within the viewport when `bounds` is given. */
export const mapPinsQuerySchema = z
  .object({ ...filters, bounds: boundsBox.optional() })
  .superRefine(checkPrice);

export type MapPinsQuery = z.output<typeof mapPinsQuerySchema>;
