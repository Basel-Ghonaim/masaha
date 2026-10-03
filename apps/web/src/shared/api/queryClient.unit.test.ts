import { describe, expect, it } from 'vitest';
import { createQueryClient } from './queryClient';

describe('createQueryClient', () => {
  it('never retries a query, refetches on focus, keeps data fresh for 30 s, and always runs', () => {
    expect(createQueryClient().getDefaultOptions().queries).toEqual({
      retry: false,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
      networkMode: 'always',
    });
  });

  it('never retries a mutation, and never holds one back while offline', () => {
    expect(createQueryClient().getDefaultOptions().mutations).toEqual({
      retry: false,
      networkMode: 'always',
    });
  });

  it('creates a new client on each call', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
