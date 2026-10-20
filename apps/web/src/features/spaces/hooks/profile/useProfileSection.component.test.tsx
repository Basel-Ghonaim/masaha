import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import type { ProfileValues } from '../../types/ProfileValues';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { useProfileSection } from './useProfileSection';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const SPACE = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: null,
  descriptionAr: null,
  descriptionEn: null,
  areaId: 11,
  addressAr: 'شارع النصر',
  addressEn: null,
  landmarkAr: 'قرب المفترق',
  landmarkEn: null,
  location: { lat: 31.5195, lng: 34.447 },
  isVerified: false,
  updatedAt: { profile: '2026-10-10T08:00:00Z' },
  staleGroups: [],
} as unknown as AdminSpace;

/**
 * The profile's section of `space`, the server answering every write with `write`; the space's read
 * is already in the cache, as the editor holds it.
 */
function renderSection(
  write: (request: Request) => FakeAnswer | Promise<FakeAnswer> = () => ok(SPACE),
) {
  const requests = fakeTransport((request) =>
    request.method === 'get' ? ok(SPACE) : write(request),
  );
  const client = createQueryClient();
  client.setQueryData(EDITOR_SCOPES.admin.spaceKey(7), SPACE);
  const onDirtyChange = vi.fn<(group: FactGroup, dirty: boolean) => void>();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(
    ({ space }) => useProfileSection({ place: 'admin', space, onDirtyChange }),
    {
      wrapper,
      initialProps: { space: SPACE },
    },
  );
  const writes = () => requests.filter(({ method }) => method !== 'get');
  return { ...rendered, writes, client, onDirtyChange };
}

type Rendered = ReturnType<typeof renderSection>['result'];

async function type(result: Rendered, name: Exclude<keyof ProfileValues, 'areaId'>, value: string) {
  await act(async () => {
    await result.current.fields.field(name).onChange({ target: { name, value } });
  });
}

function save(result: Rendered) {
  act(() => {
    result.current.frame.save.submit();
  });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useProfileSection', () => {
  it('sends only the fields that changed, a cleared optional one as null', async () => {
    const { result, writes } = renderSection();
    await type(result, 'nameEn', 'Focus Hub Gaza');
    await type(result, 'landmarkAr', '');

    save(result);

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({ nameEn: 'Focus Hub Gaza', landmarkAr: null });
  });

  it('sends nothing for a profile as saved, and says how to renew its date', async () => {
    const { result, writes } = renderSection();

    save(result);

    await waitFor(() => {
      expect(result.current.frame.note).toBe(
        'Nothing changed. To renew its date, choose “Still correct”.',
      );
    });
    expect(writes()).toHaveLength(0);
  });

  it('sends only its own changes when another admin’s change arrives while it has unsaved ones', async () => {
    const { result, rerender, writes } = renderSection();
    await type(result, 'nameEn', 'Focus Hub Gaza');

    rerender({ space: { ...SPACE, addressAr: 'شارع البحر' } });
    save(result);

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({ nameEn: 'Focus Hub Gaza' });
  });

  it('keeps its unsaved changes when the space arrives again, as after another section’s save', async () => {
    const { result, rerender } = renderSection();
    await type(result, 'nameEn', 'Focus Hub Gaza');

    rerender({ space: { ...SPACE, addressAr: 'شارع البحر' } });

    // The form still differs from what it was given: its own edit was not swept away.
    expect(result.current.frame.unsaved).toBe('Unsaved changes');
  });

  it('puts the server’s refusal on its field', async () => {
    const { result } = renderSection(() =>
      refused(422, { type: 'validation', errors: { nameEn: ['invalid_format'] } }),
    );
    await type(result, 'nameEn', 'Focus Hub Gaza');

    save(result);

    await waitFor(() => {
      expect(result.current.fields.errors.nameEn).toBe(
        'Use Latin letters or digits in the English name',
      );
    });
  });

  it.each([
    [403, 'forbidden', 'The space was verified meanwhile: its owner edits it now.'],
    [404, 'not_found', 'The space was deleted meanwhile.'],
  ] as const)(
    'says why a %s refused it, and fetches the space again',
    async (status, type_, line) => {
      const { result, client } = renderSection(() => refused(status, { type: type_ }));
      await type(result, 'nameEn', 'Focus Hub Gaza');

      save(result);

      await waitFor(() => {
        expect(result.current.frame.failure).toMatchObject({ message: line });
      });
      expect(client.getQueryState(EDITOR_SCOPES.admin.spaceKey(7))?.isInvalidated).toBe(true);
    },
  );

  it('tells the editor whether it has unsaved changes, and that it has none once saved or gone', async () => {
    const { result, onDirtyChange, unmount } = renderSection();

    await type(result, 'nameEn', 'Focus Hub Gaza');
    expect(onDirtyChange).toHaveBeenLastCalledWith('profile', true);
    save(result);
    await waitFor(() => {
      expect(onDirtyChange).toHaveBeenLastCalledWith('profile', false);
    });

    await type(result, 'nameEn', 'Focus Hub Gaza 2');
    expect(onDirtyChange).toHaveBeenLastCalledWith('profile', true);
    unmount();
    expect(onDirtyChange).toHaveBeenLastCalledWith('profile', false);
  });

  it('keeps the answer it stored as fresh', async () => {
    const { result, client } = renderSection(() => ok({ ...SPACE, nameEn: 'Focus Hub Gaza' }));
    await type(result, 'nameEn', 'Focus Hub Gaza');

    save(result);

    await waitFor(() => {
      expect(client.getQueryData(EDITOR_SCOPES.admin.spaceKey(7))).toMatchObject({
        nameEn: 'Focus Hub Gaza',
      });
    });
    expect(client.getQueryState(EDITOR_SCOPES.admin.spaceKey(7))?.isInvalidated).toBe(false);
  });

  it('clears “nothing changed” and a save’s failure on Discard', async () => {
    const { result } = renderSection(() => ({ failure: 'ERR_NETWORK' }));
    save(result);
    await waitFor(() => {
      expect(result.current.frame.note).not.toBeNull();
    });
    await type(result, 'nameEn', 'Focus Hub Gaza');
    act(() => {
      result.current.frame.discard?.run();
    });
    expect(result.current.frame.note).toBeNull();

    await type(result, 'nameEn', 'Focus Hub Gaza');
    save(result);
    await waitFor(() => {
      expect(result.current.frame.failure?.kind).toBe('offline');
    });
    act(() => {
      result.current.frame.discard?.run();
    });
    expect(result.current.frame.failure).toBeNull();
  });

  it('clears a save’s failure once the group is confirmed', async () => {
    let fail = true;
    const { result } = renderSection(() => (fail ? { failure: 'ERR_NETWORK' } : ok(SPACE)));
    await type(result, 'nameEn', 'Focus Hub Gaza');
    save(result);
    await waitFor(() => {
      expect(result.current.frame.failure?.kind).toBe('offline');
    });
    act(() => {
      result.current.frame.discard?.run();
    });

    fail = false;
    act(() => {
      result.current.frame.confirm?.run();
    });

    await waitFor(() => {
      expect(result.current.frame.confirm?.pending).toBe(false);
    });
    expect(result.current.frame.failure).toBeNull();
  });

  it('holds both the confirmation and Save while a 429 on the confirmation counts down', async () => {
    const { result } = renderSection(() =>
      refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }),
    );

    act(() => {
      result.current.frame.confirm?.run();
    });

    await waitFor(() => {
      expect(result.current.frame.confirm?.blocked).toBe(true);
    });
    expect(result.current.frame.save.blocked).toBe(true);
    expect(result.current.frame.failure?.kind).toBe('rateLimit');
  });
});
