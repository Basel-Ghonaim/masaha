import { z } from 'zod';

import { LANGUAGES, paginationQuerySchema, textSchema } from '../core/index.ts';
import { PRICE_MAX_AGOROT, PRICE_PERIODS, SPACE_NAME_MAX_LENGTH } from '../spaces/index.ts';

// The public directory's reads (docs/api/api-contract.md §5, Directory (public)).

/** The most areas one filter names. */
export const DIRECTORY_AREAS_MAX = 50;

/** The most pins the map's read answers; past it, the first ones by id, marked truncated. */
export const MAP_PINS_CEILING = 1000;

/**
 * The list's orders: the latest update first; by name in the interface's language; and best match
 * first, the default when `q` is given.
 */
export const DIRECTORY_SORTS = ['updated', 'name', 'relevance'] as const;

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

/** Part of a name or of an area's name, in either language; refused when it holds nothing to match. */
const searchText = textSchema(1, SPACE_NAME_MAX_LENGTH).refine(
  (text) => !NOT_SEARCHABLE.test(text),
  { params: { code: 'invalid_format' } },
);

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
 * and the page. `sort` defaults to `relevance` with `q` and to `updated` without.
 */
export const directoryQuerySchema = paginationQuerySchema
  .extend({
    ...filters,
    sort: z.enum(DIRECTORY_SORTS).optional(),
    lang: z.enum(LANGUAGES).default('ar'),
  })
  .superRefine((query, ctx) => {
    checkPrice(query, ctx);
    if (query.sort === 'relevance' && query.q === undefined) {
      ctx.addIssue({ code: 'custom', path: ['sort'], params: { code: 'invalid_choice' } });
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
