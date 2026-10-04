import type { PaginationMeta, SuccessEnvelope } from '@masaha/shared/core';
import { describe, expect, it } from 'vitest';
import { unwrap } from './envelope';

const META: PaginationMeta = {
  currentPage: 1,
  limit: 20,
  totalPages: 3,
  totalRecords: 41,
  hasNextPage: true,
  hasPreviousPage: false,
};

describe('unwrap', () => {
  it('returns the envelope’s data', () => {
    const response = {
      data: { success: true, data: { id: 7 } } satisfies SuccessEnvelope<{ id: number }>,
    };

    expect(unwrap(response)).toEqual({ id: 7 });
  });

  it('leaves meta on the response, for the calls that need it', () => {
    const response = {
      data: { success: true, data: [{ id: 7 }], meta: META } satisfies SuccessEnvelope<
        { id: number }[],
        PaginationMeta
      >,
    };

    unwrap(response);

    expect(response.data.meta).toEqual(META);
  });
});
