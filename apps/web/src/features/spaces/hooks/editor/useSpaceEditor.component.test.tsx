import type { AdminSpace } from '@masaha/shared/spaces';
import { act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeIntersectionObserver } from '../../../../test/fakeIntersectionObserver';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { renderHookInRouter } from '../../../../test/renderHookInRouter';
import { startPreferences } from '../../../../test/startPreferences';
import { EDITOR_SCOPES } from './editorScope';
import { useSpaceEditor } from './useSpaceEditor';

const SPACE = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: null,
  isHidden: false,
  isVerified: false,
  owners: [],
  missingGroups: ['hours', 'prices', 'amenities', 'contacts'],
} as unknown as AdminSpace;

/** The editor of space 7, the server answering its read with `read`. */
function renderEditor(read: () => FakeAnswer | Promise<FakeAnswer> = () => ok(SPACE)) {
  fakeTransport(read);
  return renderHookInRouter(() => useSpaceEditor('admin', 7), { path: '/spaces/7' });
}

/** The editor once its space has loaded. */
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

  it('is the 404 for a space that does not exist or was deleted', async () => {
    const { result } = renderEditor(() => refused(404, { type: 'not_found' }));

    await waitFor(() => {
      expect(result.current.state).toBe('notFound');
    });
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

  it('lists the five groups while one is missing, each line a link to its section', async () => {
    const { result } = renderEditor();

    const editor = await ready(result);

    expect(
      editor.checklist?.items.map(({ group, href, status, variant }) => [
        group,
        href,
        status,
        variant,
      ]),
    ).toEqual([
      ['profile', '#profile', 'Done', 'success'],
      ['hours', '#hours', 'Not added yet', 'warning'],
      ['prices', '#prices', 'Not added yet', 'warning'],
      ['amenities', '#amenities', 'Not added yet', 'warning'],
      ['contacts', '#contacts', 'Not added yet', 'warning'],
    ]);
  });

  it('has no checklist once nothing is missing', async () => {
    const complete = renderEditor(() => ok({ ...SPACE, missingGroups: [] }));
    expect((await ready(complete.result)).checklist).toBeNull();
  });

  it('is read-only for a verified space, with no checklist', async () => {
    const { result } = renderEditor(() => ok({ ...SPACE, isVerified: true }));

    const editor = await ready(result);

    expect(editor.readOnly).toBe(true);
    expect(editor.checklist).toBeNull();
  });

  it('shows its state as two facts: whether it is verified, and hidden', async () => {
    const { result } = renderEditor(() => ok({ ...SPACE, isHidden: true }));

    expect((await ready(result)).badges).toEqual([
      { label: 'Unverified', variant: 'neutral' },
      { label: 'Hidden', variant: 'warning' },
    ]);
  });

  it('asks before leaving while a section reports unsaved changes, in the groups’ order, and no longer once it reports none', async () => {
    const { result, router } = renderEditor();
    const editor = await ready(result);

    act(() => {
      editor.onDirtyChange('contacts', true);
      editor.onDirtyChange('profile', true);
    });
    await act(() => router.navigate('/elsewhere'));
    expect(result.current.guard.description).toBe(
      'Unsaved changes in The space and Contacts will be lost.',
    );
    act(() => {
      result.current.guard.stay.run();
      editor.onDirtyChange('contacts', false);
      editor.onDirtyChange('profile', false);
    });

    await act(() => router.navigate('/elsewhere'));
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('says whether the hours have unsaved changes, for the prices', async () => {
    const { result } = renderEditor();
    const editor = await ready(result);

    act(() => {
      editor.onDirtyChange('profile', true);
    });
    expect(result.current).toMatchObject({ hoursUnsaved: false });
    act(() => {
      editor.onDirtyChange('hours', true);
    });
    expect(result.current).toMatchObject({ hoursUnsaved: true });
    act(() => {
      editor.onDirtyChange('hours', false);
    });
    expect(result.current).toMatchObject({ hoursUnsaved: false });
  });

  it('says the changes are being saved while one of the space’s writes is pending', async () => {
    const { result, router, client } = renderEditor();
    const editor = await ready(result);
    act(() => {
      editor.onDirtyChange('profile', true);
    });

    act(() => {
      void client
        .getMutationCache()
        .build(client, {
          mutationKey: EDITOR_SCOPES.admin.writeKey(7),
          mutationFn: () => new Promise(() => undefined),
        })
        .execute(undefined);
    });
    await act(() => router.navigate('/elsewhere'));

    await waitFor(() => {
      expect(result.current.guard.description).toBe('The changes in The space are being saved.');
    });
  });
});
