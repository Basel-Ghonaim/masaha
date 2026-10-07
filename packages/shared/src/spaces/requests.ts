import { z } from 'zod';

import { paragraphSchema, textSchema } from '../core/index.ts';
import { isInGazaStrip } from './gazaStrip.ts';

// The requests of the admin's space endpoints (docs/api/api-contract.md §5, Spaces (the admin)).

export const SPACE_NAME_MAX_LENGTH = 80;
export const SPACE_DESCRIPTION_MAX_LENGTH = 1000;
export const SPACE_ADDRESS_MAX_LENGTH = 200;
export const SPACE_LANDMARK_MAX_LENGTH = 120;

// The largest id an Int column holds.
const id = z.number().int().positive().max(2_147_483_647);

const name = textSchema(1, SPACE_NAME_MAX_LENGTH);
const address = textSchema(1, SPACE_ADDRESS_MAX_LENGTH);

/** An optional field: absent or `null` when there is none. */
function optional<T extends z.ZodType>(schema: T) {
  return schema.nullable().optional();
}

/** The map pin: a point in the Gaza Strip, refused elsewhere with `out_of_range`. */
const location = z
  .object({ lat: z.number(), lng: z.number() })
  .refine(isInGazaStrip, { params: { code: 'out_of_range' } });

/**
 * A space's profile, its basics and its location. The English name is required and the Arabic one
 * optional; the Arabic address is required and the English one optional; the descriptions and the
 * landmark are optional in both languages (docs/architecture/data-model.md › Conventions). A
 * description may break lines.
 */
const profile = {
  nameEn: name,
  nameAr: optional(name),
  descriptionAr: optional(paragraphSchema(1, SPACE_DESCRIPTION_MAX_LENGTH)),
  descriptionEn: optional(paragraphSchema(1, SPACE_DESCRIPTION_MAX_LENGTH)),
  areaId: id,
  addressAr: address,
  addressEn: optional(address),
  landmarkAr: optional(textSchema(1, SPACE_LANDMARK_MAX_LENGTH)),
  landmarkEn: optional(textSchema(1, SPACE_LANDMARK_MAX_LENGTH)),
  location,
};

/** A new, unverified space, from its profile; the admin places its pin before saving. */
export const createSpaceSchema = z.object(profile);
export type CreateSpaceRequest = z.infer<typeof createSpaceSchema>;

/** Edits the profile: what is absent is kept, and an optional field is cleared with `null`. */
export const updateSpaceProfileSchema = createSpaceSchema.partial();
export type UpdateSpaceProfileRequest = z.infer<typeof updateSpaceProfileSchema>;

/** Hides the space from the public, or shows it again. */
export const setSpaceHiddenSchema = z.object({ isHidden: z.boolean() });
export type SetSpaceHiddenRequest = z.infer<typeof setSpaceHiddenSchema>;

// ─── The facts: each group is saved whole, alone (decision F1) ───────────────────────────────

/** Minutes after midnight in a day: a time of day, 1440 the midnight that ends it. */
export const DAY_MINUTES = 1440;
export const SHIFT_NAME_MAX_LENGTH = 40;
export const MAX_SHIFTS = 10;

const minute = z.number().int().min(0).max(DAY_MINUTES);

/** Within one day, a range closes after it opens (decision F4: none runs past midnight). */
function closesAfterOpening<K extends string>(from: K, to: K) {
  return (range: Record<K, number>) => range[from] < range[to];
}

/** A day's opening range, in minutes after midnight; 0–1440 is open around the clock. */
const openingRange = z
  .object({ opensMinute: minute, closesMinute: minute })
  .refine(closesAfterOpening('opensMinute', 'closesMinute'), {
    path: ['closesMinute'],
    params: { code: 'out_of_range' },
  });

/** A named shift inside the opening hours; `id` names a shift the space already has. */
const shift = z
  .object({
    id: id.optional(),
    nameAr: textSchema(1, SHIFT_NAME_MAX_LENGTH),
    nameEn: optional(textSchema(1, SHIFT_NAME_MAX_LENGTH)),
    startsMinute: minute,
    endsMinute: minute,
  })
  .refine(closesAfterOpening('startsMinute', 'endsMinute'), {
    path: ['endsMinute'],
    params: { code: 'out_of_range' },
  });

/** The positions of the items whose key an earlier item already has. */
function repeats<T>(items: readonly T[], key: (item: T) => unknown): number[] {
  const seen = new Set<unknown>();
  return items.flatMap((item, index) => {
    const value = key(item);
    if (value === undefined) return [];
    if (seen.has(value)) return [index];
    seen.add(value);
    return [];
  });
}

/** Marks each repeated item `not_unique` on its field (the owner's answer A1). */
function refuseRepeats<T>(
  ctx: z.RefinementCtx,
  list: string,
  items: readonly T[],
  field: (item: T) => string,
  key: (item: T) => unknown,
) {
  for (const index of repeats(items, key)) {
    ctx.addIssue({
      code: 'custom',
      path: [list, index, field(items[index] as T)],
      params: { code: 'not_unique' },
      message: 'Repeats an earlier item',
    });
  }
}

/**
 * The opening hours with the shifts, saved together (decision F3). `days[0]` is Sunday … `days[6]`
 * Saturday, `null` when closed. The shifts' order is the order they are shown in; a shift keeps
 * its `id`, a new one has none (decision F5). A shift lies inside the hours of at least one open
 * day (decision D4), and its Arabic name is its own.
 */
export const updateSpaceHoursSchema = z
  .object({
    days: z.array(openingRange.nullable()).length(7),
    shifts: z.array(shift).max(MAX_SHIFTS),
  })
  .superRefine(({ days, shifts }, ctx) => {
    refuseRepeats(
      ctx,
      'shifts',
      shifts,
      () => 'nameAr',
      (item) => item.nameAr,
    );
    refuseRepeats(
      ctx,
      'shifts',
      shifts,
      () => 'id',
      (item) => item.id,
    );
    shifts.forEach((item, index) => {
      const inside = days.some(
        (day) =>
          day !== null &&
          day.opensMinute <= item.startsMinute &&
          item.endsMinute <= day.closesMinute,
      );
      if (!inside) {
        ctx.addIssue({
          code: 'custom',
          path: ['shifts', index],
          params: { code: 'out_of_range' },
          message: 'Outside the hours of every open day',
        });
      }
    });
  });
export type UpdateSpaceHoursRequest = z.infer<typeof updateSpaceHoursSchema>;

export const PRICE_PERIODS = ['HOUR', 'DAY', 'WEEK', 'MONTH'] as const;
export const PRICE_AUDIENCES = ['GENERAL', 'STUDENT'] as const;
export const PRICE_LABEL_MAX_LENGTH = 60;
export const MAX_PRICES = 40;
/** ₪100,000: the largest price, a guard against a slip of the keyboard. */
export const PRICE_MAX_AGOROT = 10_000_000;

const priceLabel = textSchema(1, PRICE_LABEL_MAX_LENGTH);

/**
 * A published price: a period and an audience, an optional shift of the space, and an optional
 * custom label, its Arabic required with its English (docs/architecture/data-model.md › Prices).
 * Amounts are whole agorot (display only in v1).
 */
const price = z
  .object({
    period: z.enum(PRICE_PERIODS),
    audience: z.enum(PRICE_AUDIENCES),
    shiftId: optional(id),
    labelAr: optional(priceLabel),
    labelEn: optional(priceLabel),
    amountAgorot: z.number().int().min(0).max(PRICE_MAX_AGOROT),
  })
  .refine((item) => item.labelEn == null || item.labelAr != null, {
    path: ['labelAr'],
    params: { code: 'required' },
  });

/**
 * The prices, whole, in the order they are shown in. One price per period, audience, shift and
 * label, a missing shift or label counting as one value (the database's four keys): a repeat is
 * named on the field that would tell it apart, the label, else the shift, else the period.
 */
export const updateSpacePricesSchema = z
  .object({ prices: z.array(price).max(MAX_PRICES) })
  .superRefine(({ prices }, ctx) => {
    refuseRepeats(
      ctx,
      'prices',
      prices,
      (item) => (item.labelAr != null ? 'labelAr' : item.shiftId != null ? 'shiftId' : 'period'),
      (item) =>
        JSON.stringify([item.period, item.audience, item.shiftId ?? null, item.labelAr ?? null]),
    );
  });
export type UpdateSpacePricesRequest = z.infer<typeof updateSpacePricesSchema>;
