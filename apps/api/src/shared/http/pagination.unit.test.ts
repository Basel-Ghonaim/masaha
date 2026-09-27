import { paginationQuerySchema } from '@masaha/shared';
import { describe, expect, it } from 'vitest';

import { buildPaginationMeta, toSkip } from './pagination.ts';

describe('paginationQuerySchema', () => {
  it('defaults to the first page of 20', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('coerces query-string numbers', () => {
    expect(paginationQuerySchema.parse({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 });
  });

  it.each([{ page: '0' }, { page: '1.5' }, { page: 'x' }, { limit: '0' }, { limit: '51' }])(
    'refuses %o',
    (query) => {
      expect(paginationQuerySchema.safeParse(query).success).toBe(false);
    },
  );
});

describe('toSkip', () => {
  it('skips the rows of the pages before', () => {
    expect(toSkip({ page: 1, limit: 20 })).toBe(0);
    expect(toSkip({ page: 3, limit: 20 })).toBe(40);
  });
});

describe('buildPaginationMeta', () => {
  it('describes a middle page', () => {
    expect(buildPaginationMeta({ page: 2, limit: 20 }, 45)).toEqual({
      currentPage: 2,
      limit: 20,
      totalPages: 3,
      totalRecords: 45,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('describes the first and last pages', () => {
    expect(buildPaginationMeta({ page: 1, limit: 20 }, 45)).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
    });
    expect(buildPaginationMeta({ page: 3, limit: 20 }, 45)).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('counts a full last page exactly', () => {
    expect(buildPaginationMeta({ page: 2, limit: 20 }, 40)).toMatchObject({
      totalPages: 2,
      hasNextPage: false,
    });
  });

  it('describes an empty list as no pages', () => {
    expect(buildPaginationMeta({ page: 1, limit: 20 }, 0)).toEqual({
      currentPage: 1,
      limit: 20,
      totalPages: 0,
      totalRecords: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});
