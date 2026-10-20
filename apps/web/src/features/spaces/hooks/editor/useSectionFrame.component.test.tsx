import type { AdminSpace } from '@masaha/shared/spaces';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import type { EditorPlace } from '../../types/EditorPlace';
import { useSectionFrame } from './useSectionFrame';

/** A space whose contacts were saved, so they can be confirmed. */
const SPACE = {
  id: 7,
  updatedAt: {
    profile: '2026-10-10T08:00:00Z',
    hours: null,
    prices: null,
    amenities: null,
    contacts: '2026-10-10T08:00:00Z',
  },
  staleGroups: [],
} as unknown as AdminSpace;

/** The contacts' frame at `place`, its form unchanged, the server refusing with a 403. */
function renderFrame(place: EditorPlace) {
  const requests = fakeTransport(() => refused(403, { type: 'forbidden' }));
  const rendered = renderHook(
    () =>
      useSectionFrame({
        place,
        space: SPACE,
        group: 'contacts',
        form: {
          submit: vi.fn(),
          isPending: false,
          blocked: false,
          failure: null,
          isDirty: false,
          discard: vi.fn(),
          unchanged: false,
        },
        onDirtyChange: vi.fn(),
      }),
    { wrapper: queryWrapper() },
  );
  return { ...rendered, requests };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useSectionFrame', () => {
  it('never tells the owner the space was verified meanwhile, on a 403', async () => {
    const { result, requests } = renderFrame('owner');

    act(() => {
      result.current.confirm?.run();
    });

    await waitFor(() => {
      expect(result.current.failure?.message).toBe(
        'This is no longer open to you at this space; nothing was saved.',
      );
    });
    expect(result.current.failure?.message).not.toMatch(/verified/);
    expect(requests[0]).toMatchObject({ method: 'post', url: '/manage/spaces/7/contacts/confirm' });
  });

  it('tells the admin the space was verified meanwhile, on a 403', async () => {
    const { result } = renderFrame('admin');

    act(() => {
      result.current.confirm?.run();
    });

    await waitFor(() => {
      expect(result.current.failure?.message).toBe(
        'The space was verified meanwhile: its owner edits it now.',
      );
    });
  });
});
