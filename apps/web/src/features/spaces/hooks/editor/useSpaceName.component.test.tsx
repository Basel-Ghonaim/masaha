import type { AdminSpace } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { EDITOR_SCOPES } from './editorScope';
import { useSpaceName } from './useSpaceName';

const SPACE = { id: 7, nameEn: 'Focus Hub', nameAr: null } as unknown as AdminSpace;

beforeEach(() => {
  startPreferences('ar');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useSpaceName', () => {
  it('is the space’s name once it has loaded, an English-only one marked in Arabic', async () => {
    fakeTransport(() => ok(SPACE));
    const client = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSpaceName(7), { wrapper });

    expect(result.current).toBeUndefined();
    await waitFor(() => {
      expect(result.current).toEqual({ text: 'Focus Hub', lang: 'en', dir: 'ltr' });
    });
  });

  it('is no name once the space is found deleted, though it was read before', async () => {
    let deleted = false;
    fakeTransport(() => (deleted ? refused(404, { type: 'not_found' }) : ok(SPACE)));
    const client = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSpaceName(7), { wrapper });
    await waitFor(() => {
      expect(result.current?.text).toBe('Focus Hub');
    });

    deleted = true;
    await act(() => client.invalidateQueries({ queryKey: EDITOR_SCOPES.admin.spaceKey(7) }));

    await waitFor(() => {
      expect(result.current).toBeUndefined();
    });
  });
});
