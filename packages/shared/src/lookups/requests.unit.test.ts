import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import { toFieldErrors } from '../core/index.ts';
import {
  createAmenitySchema,
  createAreaSchema,
  createGovernorateSchema,
  LOOKUP_NAME_MAX_LENGTH,
  orderSchema,
  updateAmenitySchema,
  updateAreaSchema,
  updateGovernorateSchema,
} from './requests.ts';

/** The field-error codes a schema answers for `input`, as the server would send them. */
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? null : toFieldErrors(result.error.issues, input);
}

const names = { nameAr: 'رفح', nameEn: 'Rafah' };

describe('createGovernorateSchema', () => {
  it('requires both names', () => {
    expect(fieldErrors(createGovernorateSchema, {})).toEqual({
      nameAr: ['required'],
      nameEn: ['required'],
    });
    expect(fieldErrors(createGovernorateSchema, { ...names, nameEn: '  ' })).toEqual({
      nameEn: ['too_short'],
    });
  });

  it('takes user text: normalised and trimmed, one line, within the length', () => {
    expect(createGovernorateSchema.parse({ nameAr: ' رفح ', nameEn: 'Rafah ' })).toEqual(names);
    expect(
      fieldErrors(createGovernorateSchema, {
        nameAr: 'ر'.repeat(LOOKUP_NAME_MAX_LENGTH + 1),
        nameEn: 'Ra‮fah',
      }),
    ).toEqual({ nameAr: ['too_long'], nameEn: ['invalid_format'] });
  });
});

describe('updateGovernorateSchema', () => {
  it('keeps what is absent, and takes the active flag', () => {
    expect(updateGovernorateSchema.parse({})).toEqual({});
    expect(updateGovernorateSchema.parse({ isActive: false })).toEqual({ isActive: false });
    expect(fieldErrors(updateGovernorateSchema, { nameAr: '', isActive: 'no' })).toEqual({
      nameAr: ['too_short'],
      isActive: ['invalid_format'],
    });
  });
});

describe('createAreaSchema', () => {
  it('requires its governorate and both names', () => {
    expect(createAreaSchema.parse({ governorateId: 2, ...names })).toEqual({
      governorateId: 2,
      ...names,
    });
    expect(fieldErrors(createAreaSchema, { governorateId: 0, nameAr: 'رفح' })).toEqual({
      governorateId: ['out_of_range'],
      nameEn: ['required'],
    });
  });
});

describe('updateAreaSchema', () => {
  it('never moves an area to another governorate', () => {
    expect(updateAreaSchema.parse({ governorateId: 3, nameEn: 'Rafah' })).toEqual({
      nameEn: 'Rafah',
    });
  });
});

describe('createAmenitySchema', () => {
  const coffee = { nameAr: 'مشروبات ساخنة', nameEn: 'Hot drinks', icon: 'coffee' };

  it('requires both names, an icon from the list and the filter flag', () => {
    expect(createAmenitySchema.parse({ ...coffee, isFilterable: false })).toEqual({
      ...coffee,
      isFilterable: false,
    });
    expect(fieldErrors(createAmenitySchema, {})).toEqual({
      nameAr: ['required'],
      nameEn: ['required'],
      icon: ['invalid_choice'],
      isFilterable: ['required'],
    });
  });

  it('refuses an icon outside the list', () => {
    expect(
      fieldErrors(createAmenitySchema, { ...coffee, icon: 'printer', isFilterable: true }),
    ).toEqual({
      icon: ['invalid_choice'],
    });
  });
});

describe('updateAmenitySchema', () => {
  it('never changes the key', () => {
    expect(updateAmenitySchema.parse({ key: 'tea', icon: 'zap', isActive: false })).toEqual({
      icon: 'zap',
      isActive: false,
    });
  });
});

describe('orderSchema', () => {
  it('takes a list of ids, an empty one included', () => {
    expect(orderSchema.parse({ ids: [3, 1, 2] })).toEqual({ ids: [3, 1, 2] });
    expect(orderSchema.parse({ ids: [] })).toEqual({ ids: [] });
  });

  it.each([[[0]], [[-1]], [[1.5]], [['1']], [[2_147_483_648]]])('refuses the ids %j', (ids) => {
    expect(orderSchema.safeParse({ ids }).success).toBe(false);
  });

  it('requires the list', () => {
    expect(fieldErrors(orderSchema, {})).toEqual({ ids: ['required'] });
  });
});
