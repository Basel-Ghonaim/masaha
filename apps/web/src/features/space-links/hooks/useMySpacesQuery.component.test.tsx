import type { ManagedSpace } from '@masaha/shared/space-links';
import { apiClient, createQueryClient, setupApiClient, type QueryClient } from '@shared/api';
import { AppError } from '@shared/errors';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { useMySpacesQuery } from './useMySpacesQuery';

const RECEPTION_AT_NOOK: ManagedSpace = {
  spaceId: 3,
  role: 'RECEPTION',
  slug: 'nook',
  nameAr: null,
  nameEn: 'Nook',
  area: { nameAr: 'النصر', nameEn: 'An-Nasr' },
};

const originalAdapter = apiClient.defaults.adapter;
let queryClient: QueryClient;

/** The hook on the real path: the repository, then the transport, with a fake server behind it. */
function renderMySpaces(answer: FakeAnswer) {
  const server = fakeAdapter(() => answer);
  apiClient.defaults.adapter = server.adapter;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useMySpacesQuery(), { wrapper }), requests: server.requests };
}

beforeEach(() => {
  setupApiClient({ getAccessToken: () => 'token-1' });
  queryClient = createQueryClient();
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  queryClient.clear();
});

describe('useMySpacesQuery', () => {
  it('resolves to the user’s spaces, held under the key [me, spaces]', async () => {
    const { result, requests } = renderMySpaces({
      status: 200,
      data: { success: true, data: [RECEPTION_AT_NOOK] },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([RECEPTION_AT_NOOK]);
    expect(queryClient.getQueryData(['me', 'spaces'])).toEqual([RECEPTION_AT_NOOK]);
    expect(requests.map(({ url }) => url)).toEqual(['/manage/spaces']);
  });

  it('exposes a refusal as the AppError, with no data', async () => {
    const { result } = renderMySpaces({
      status: 403,
      data: {
        success: false,
        error: { type: 'forbidden', message: 'Fake refusal', requestId: 'req-1' },
      },
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toBeInstanceOf(AppError);
    expect(result.current.error).toMatchObject({ type: 'forbidden', status: 403 });
    expect(result.current.data).toBeUndefined();
  });
});
