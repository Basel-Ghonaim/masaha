import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { directoryQuerySchema, mapPinsQuerySchema } from './requests.ts';

/** The field errors a list query fails with, or null when it passes. */
function listErrors(query: Record<string, string>) {
  const result = directoryQuerySchema.safeParse(query);
  return result.success ? null : toFieldErrors(result.error.issues, query);
}

/** The field errors a map query fails with, or null when it passes. */
function mapErrors(query: Record<string, string>) {
  const result = mapPinsQuerySchema.safeParse(query);
  return result.success ? null : toFieldErrors(result.error.issues, query);
}

describe('directoryQuerySchema', () => {
  it('defaults to the first page of 20, by the latest update, named in Arabic', () => {
    expect(directoryQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 20,
      lang: 'ar',
      sort: 'updated',
    });
  });

  it('orders by relevance by default when q is given, and refuses relevance without q', () => {
    expect(directoryQuerySchema.parse({ q: 'Focus' })).toMatchObject({ sort: 'relevance' });
    expect(directoryQuerySchema.parse({ q: 'Focus', sort: 'name' })).toMatchObject({
      sort: 'name',
    });
    expect(listErrors({ sort: 'relevance' })).toEqual({ sort: ['invalid_choice'] });
  });

  it('refuses a q made only of tashkeel, tatweel or spaces, which would match every space', () => {
    expect(listErrors({ q: '\u064E\u0650' })).toEqual({ q: ['invalid_format'] });
    expect(listErrors({ q: '\u0640\u0640\u0640' })).toEqual({ q: ['invalid_format'] });
    expect(listErrors({ q: '\u0640 \u0670' })).toEqual({ q: ['invalid_format'] });
    expect(listErrors({ q: '   ' })?.q).toContain('too_short');
    expect(listErrors({ q: 'مَساحة' })).toBeNull();
  });

  it('reads the area list as distinct ids, at most 50', () => {
    expect(directoryQuerySchema.parse({ area: '3,7,3' })).toMatchObject({ area: [3, 7] });
    const fifty = Array.from({ length: 50 }, (_, i) => String(i + 1)).join(',');
    expect(listErrors({ area: fifty })).toBeNull();
    expect(listErrors({ area: `${fifty},51` })).toEqual({ area: ['too_long'] });
  });

  it.each(['3,', ',3', '3,x', '0', '3.5', '2147483648', ''])('refuses the area list %j', (area) => {
    expect(listErrors({ area })).toEqual({ area: ['invalid_format'] });
  });

  it('needs a period with a price bound, and refuses a lower bound above the upper', () => {
    expect(listErrors({ priceMin: '1000' })).toEqual({ period: ['required'] });
    expect(listErrors({ period: 'DAY', priceMin: '1000', priceMax: '999' })).toEqual({
      priceMax: ['out_of_range'],
    });
    expect(listErrors({ period: 'DAY', priceMin: '1000', priceMax: '1000' })).toBeNull();
    expect(listErrors({ period: 'DAY' })).toBeNull();
  });

  it('takes bounds in whole agorot above zero, up to the price ceiling', () => {
    expect(listErrors({ period: 'MONTH', priceMin: '0' })).toEqual({ priceMin: ['out_of_range'] });
    expect(listErrors({ period: 'MONTH', priceMax: '10000001' })).toEqual({
      priceMax: ['out_of_range'],
    });
    expect(listErrors({ period: 'MONTH', priceMin: '12.5' })).toEqual({
      priceMin: ['invalid_format'],
    });
    expect(listErrors({ period: 'YEAR' })).toEqual({ period: ['invalid_choice'] });
  });

  it('reads the boolean filters', () => {
    expect(
      directoryQuerySchema.parse({ verified: 'true', openFriday: 'true', studentPrices: 'false' }),
    ).toMatchObject({ verified: true, openFriday: true, studentPrices: false });
  });
});

describe('mapPinsQuerySchema', () => {
  it('takes the list’s filters and the viewport’s bounds', () => {
    expect(
      mapPinsQuerySchema.parse({ area: '2', verified: 'true', bounds: '31.4,34.3,31.6,34.5' }),
    ).toEqual({
      area: [2],
      verified: true,
      bounds: { south: 31.4, west: 34.3, north: 31.6, east: 34.5 },
    });
  });

  it.each(['31.4,34.3,31.6', '31.6,34.3,31.4,34.5', '31.4,34.5,31.6,34.3', '31.4,,31.6,34.5', 'x'])(
    'refuses the bounds %j',
    (bounds) => {
      expect(mapErrors({ bounds })).toEqual({ bounds: ['invalid_format'] });
    },
  );

  it('needs a period with a price bound, as the list does', () => {
    expect(mapErrors({ priceMax: '5000' })).toEqual({ period: ['required'] });
  });
});
