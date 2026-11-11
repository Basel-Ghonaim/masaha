import { act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeIntersectionObserver } from '../../../../test/fakeIntersectionObserver';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { renderHookInRouter } from '../../../../test/renderHookInRouter';
import { PHOTOS, SPACE } from '../../../../test/spaceFixtures';
import { startPreferences } from '../../../../test/startPreferences';
import type { EditorPlace } from '../../types/EditorPlace';
import { EDITOR_SCOPES } from './editorScope';
import { useSpaceEditor } from './useSpaceEditor';

/** The profile of space 7 at `place`, the server answering its read with `read`, its gallery with `photos`. */
function renderEditor(
  read: () => FakeAnswer | Promise<FakeAnswer> = () => ok(SPACE),
  place: EditorPlace = 'admin',
  photos: () => FakeAnswer | Promise<FakeAnswer> = () => ok(PHOTOS),
) {
  const requests = fakeTransport((request) =>
    request.url?.endsWith('/photos') === true ? photos() : read(),
  );
  return {
    ...renderHookInRouter(() => useSpaceEditor(place, 7), { path: '/spaces/7' }),
    requests,
  };
}

/** The profile once its space has loaded. */
async function ready(result: { current: ReturnType<typeof useSpaceEditor> }) {
  await waitFor(() => {
    expect(result.current.state).toBe('ready');
  });
  const editor = result.current;
  if (editor.state !== 'ready') throw new Error('not ready');
  return editor;
}

beforeEach(() => {
  startPreferences('en');
  fakeIntersectionObserver();
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useSpaceEditor', () => {
  it('is loading, then ready with the space', async () => {
    const { result } = renderEditor();

    expect(result.current.state).toBe('loading');
    expect((await ready(result)).space).toEqual(SPACE);
  });

  it('is the 404 once the space is found deleted, though it was loaded, so nothing stays editable', async () => {
    let deleted = false;
    const { result, client } = renderEditor(() =>
      deleted ? refused(404, { type: 'not_found' }) : ok(SPACE),
    );
    await ready(result);

    deleted = true;
    await act(() => client.invalidateQueries({ queryKey: EDITOR_SCOPES.admin.spaceKey(7) }));

    await waitFor(() => {
      expect(result.current.state).toBe('notFound');
    });
  });

  it('fails with a way to load the space again', async () => {
    let fail = true;
    const { result } = renderEditor(() => (fail ? refused(403, { type: 'forbidden' }) : ok(SPACE)));
    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    fail = false;
    const failed = result.current;
    if (failed.state !== 'failed') throw new Error('not failed');
    act(() => {
      failed.retry.run();
    });

    await ready(result);
  });

  it('lets the admin edit an unverified space, never a verified one, and the owner only that', async () => {
    const admin = renderEditor();
    expect((await ready(admin.result)).editable).toBe(true);

    const verified = renderEditor(() => ok({ ...SPACE, isVerified: true }));
    expect((await ready(verified.result)).editable).toBe(false);

    const owner = renderEditor(() => ok({ ...SPACE, isVerified: true }), 'owner');
    expect((await ready(owner.result)).editable).toBe(true);
  });

  it('opens one Sheet at a time, and closing one leaves another that was opened from it open', async () => {
    const { result } = renderEditor();
    const editor = await ready(result);

    act(() => {
      editor.openSheet('prices');
    });
    await waitFor(() => {
      expect((result.current as typeof editor).sheetHost('prices').open).toBe(true);
    });
    act(() => {
      (result.current as typeof editor).openSheet('shifts');
    });
    const now = result.current as typeof editor;
    expect(now.sheetHost('prices').open).toBe(false);
    expect(now.sheetHost('shifts').open).toBe(true);

    act(() => {
      now.sheetHost('prices').close();
    });
    expect((result.current as typeof editor).sheetHost('shifts').open).toBe(true);
  });

  it('asks before leaving only while the open Sheet has changes, naming its section', async () => {
    const { result, router } = renderEditor();
    const editor = await ready(result);
    act(() => {
      editor.openSheet('hours');
    });
    // A closed Sheet's changes are no one's: only the open one is heard.
    act(() => {
      (result.current as typeof editor).sheetHost('contacts').reportDirty(true);
    });
    await act(() => router.navigate('/elsewhere'));
    expect(router.state.location.pathname).toBe('/elsewhere');

    await act(() => router.navigate('/spaces/7'));
    const back = await ready(result);
    act(() => {
      back.openSheet('hours');
    });
    act(() => {
      (result.current as typeof editor).sheetHost('hours').reportDirty(true);
    });
    await act(() => router.navigate('/elsewhere'));

    expect(result.current.guard.open).toBe(true);
    expect(result.current.guard.description).toBe(
      'Your changes to Opening hours aren’t saved, and will be lost.',
    );
  });

  it('counts nothing while the gallery is read, then each section’s state for the index (DI-4)', async () => {
    let answer: (value: FakeAnswer) => void = () => undefined;
    const { result } = renderEditor(
      () => ok({ ...SPACE, staleGroups: ['contacts'] }),
      'admin',
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    );
    const editor = await ready(result);

    expect(editor.completeness).toBeNull();
    expect(editor.index.items.every(({ state }) => state === null)).toBe(true);
    act(() => {
      answer(ok([]));
    });

    await waitFor(() => {
      expect((result.current as typeof editor).completeness?.done).toBe(6);
    });
    const states = (result.current as typeof editor).index.items.map(({ id, state }) => [
      id,
      state,
    ]);
    expect(states).toEqual([
      ['photos', 'missing'],
      ['prices', 'ok'],
      ['hours', 'ok'],
      ['shifts', 'ok'],
      ['amenities', 'ok'],
      ['about', 'ok'],
      ['location', 'ok'],
      ['contacts', 'stale'],
    ]);
  });

  it('gives the admin the privacy line, and the owner none', async () => {
    const admin = renderEditor();
    expect((await ready(admin.result)).privacy).toMatch(/private to its management/);

    const owner = renderEditor(() => ok({ ...SPACE, isVerified: true }), 'owner');
    expect((await ready(owner.result)).privacy).toBeNull();
  });
});
