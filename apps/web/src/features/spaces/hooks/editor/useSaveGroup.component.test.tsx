import type { AdminSpace } from '@masaha/shared/spaces';
import { api, createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { EDITOR_SCOPES } from './editorScope';
import { useSaveGroup } from './useSaveGroup';

const SPACE = { id: 7, slug: 'focus-hub', nameAr: 'فوكس هب', nameEn: 'Focus Hub' } as AdminSpace;
const RENAMED = { ...SPACE, nameAr: 'مركز فوكس' } as AdminSpace;

beforeEach(() => {
  startPreferences('en');
  render(<Toaster label="Notifications" closeLabel="Close notification" />);
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
});

describe('useSaveGroup', () => {
  it('keeps an owner’s answer under the space’s scope and fetches the user’s spaces again', async () => {
    const requests = fakeTransport((request) =>
      request.url === '/manage/spaces' ? ok([]) : ok(RENAMED),
    );
    const client = createQueryClient();
    client.setQueryData(EDITOR_SCOPES.owner.spaceKey(7), SPACE);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => {
        // The switcher's read of the user's spaces, as `space-links` keeps it under the user's scope.
        const spaces = useQuery({
          queryKey: ['me', 'spaces'],
          queryFn: () => api.get<unknown[]>('/manage/spaces'),
        });
        const save = useSaveGroup('owner', 7, 'profile', (request: { nameAr: string }) =>
          EDITOR_SCOPES.owner.repository.updateProfile(7, request),
        );
        return { spaces, save };
      },
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.spaces.isSuccess).toBe(true);
    });

    await act(() => result.current.save.mutateAsync({ nameAr: 'مركز فوكس' }));

    await waitFor(() => {
      expect(requests.filter(({ url }) => url === '/manage/spaces')).toHaveLength(2);
    });
    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toContain(
      'patch /manage/spaces/7',
    );
    expect(client.getQueryData(EDITOR_SCOPES.owner.spaceKey(7))).toEqual(RENAMED);
    expect(client.getQueryState(EDITOR_SCOPES.owner.spaceKey(7))?.isInvalidated).toBe(false);
  });
});
