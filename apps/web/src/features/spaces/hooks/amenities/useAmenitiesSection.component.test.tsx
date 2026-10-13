import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { startPreferences } from '../../../../test/startPreferences';
import { useAmenitiesSection } from './useAmenitiesSection';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

/** A space whose amenities were saved: Internet (1) and the solar power (3), and one of its own. */
const SPACE = {
  id: 7,
  amenityIds: [3, 1],
  ownAmenities: [{ nameAr: 'غرفة صلاة', nameEn: 'Prayer room' }],
  isVerified: false,
  updatedAt: { amenities: '2026-10-10T08:00:00Z' },
  staleGroups: [],
} as unknown as AdminSpace;

/** A space whose amenities were never saved. */
const MISSING = {
  ...SPACE,
  amenityIds: [],
  ownAmenities: [],
  updatedAt: { amenities: null },
} as unknown as AdminSpace;

/** The amenities' section of `space`, the server answering every write with `write`. */
function renderSection(
  space: AdminSpace,
  write: (request: Request) => FakeAnswer | Promise<FakeAnswer> = () => ok(space),
) {
  const requests = fakeTransport((request) => (request.method === 'get' ? ok([]) : write(request)));
  const client = createQueryClient();
  const onDirtyChange = vi.fn<(group: FactGroup, dirty: boolean) => void>();
  render(<Toaster label="Notifications" closeLabel="Close notification" />);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(
    ({ current }) => useAmenitiesSection({ space: current, onDirtyChange }),
    { wrapper, initialProps: { current: space } },
  );
  const writes = () => requests.filter(({ method }) => method !== 'get');
  return { ...rendered, writes, client };
}

type Rendered = ReturnType<typeof renderSection>['result'];

/** Adds an own amenity and names it. */
async function addOwn(result: Rendered, nameAr: string, nameEn = '') {
  act(() => {
    result.current.own.add.run();
  });
  const row = result.current.own.rows.at(-1);
  if (row === undefined) throw new Error('no row');
  const index = result.current.own.rows.length - 1;
  await act(async () => {
    await row.nameAr.binding.onChange({
      target: { name: `ownAmenities.${String(index)}.nameAr`, value: nameAr },
    });
    await row.nameEn.binding.onChange({
      target: { name: `ownAmenities.${String(index)}.nameEn`, value: nameEn },
    });
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
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
});

describe('useAmenitiesSection', () => {
  it('sends the amenities ticked, in order of id, and its own, an English name left blank as none', async () => {
    const { result, writes } = renderSection(MISSING);

    act(() => {
      result.current.checklist.onValueChange([3, 1]);
    });
    await addOwn(result, 'خزائن');
    save(result);

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({
      amenityIds: [1, 3],
      ownAmenities: [{ nameAr: 'خزائن', nameEn: null }],
    });
  });

  it('saves a group never saved even empty, which dates it', async () => {
    const { result, writes } = renderSection(MISSING);

    save(result);

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({ amenityIds: [], ownAmenities: [] });
  });

  it('sends nothing for a saved group as it is, and says how to renew its date', async () => {
    const { result, writes } = renderSection(SPACE);

    save(result);

    await waitFor(() => {
      expect(result.current.frame.note).toBe(
        'Nothing changed. To renew its date, choose “Still correct”.',
      );
    });
    expect(writes()).toHaveLength(0);
  });

  it('refuses an own amenity with no Arabic name, and a repeated one, on their rows, sending nothing', async () => {
    const { result, writes } = renderSection(MISSING);
    await addOwn(result, 'غرفة صلاة');
    await addOwn(result, '');
    await addOwn(result, 'غرفة صلاة');

    save(result);

    await waitFor(() => {
      expect(result.current.own.rows.map((row) => row.nameAr.error)).toEqual([
        undefined,
        'Enter the Arabic name, or remove this amenity',
        'A repeated amenity',
      ]);
    });
    expect(writes()).toHaveLength(0);
  });

  it('stops adding its own amenities at twenty, saying why', () => {
    const { result } = renderSection({
      ...SPACE,
      ownAmenities: Array.from({ length: 20 }, (_, index) => ({
        nameAr: `مرفق ${String(index + 1)}`,
        nameEn: null,
      })),
    });

    expect(result.current.own.add).toMatchObject({
      disabled: true,
      reason: 'Up to 20 extra amenities',
    });
  });

  it('says a ticked amenity is no longer offered when the server refuses it on no field', async () => {
    const { result } = renderSection(MISSING, () =>
      refused(422, { type: 'validation', errors: { 'amenityIds.0': ['invalid_choice'] } }),
    );
    act(() => {
      result.current.checklist.onValueChange([2]);
    });

    save(result);

    await waitFor(() => {
      expect(result.current.frame.failure).toMatchObject({
        message: 'An amenity you ticked is no longer offered. Untick it, or reload the page.',
      });
    });
  });

  it('keeps that refusal beside one on its own rows, and fetches the admin’s lists again', async () => {
    const { result, client } = renderSection(MISSING, () =>
      refused(422, {
        type: 'validation',
        errors: { 'amenityIds.0': ['invalid_choice'], 'ownAmenities.0.nameAr': ['not_unique'] },
      }),
    );
    // The amenities' list the checklist shows, in the cache.
    client.setQueryData(['admin', 'lookups', 'amenities'], []);
    act(() => {
      result.current.checklist.onValueChange([2]);
    });
    await addOwn(result, 'غرفة صلاة');

    save(result);

    await waitFor(() => {
      expect(result.current.own.rows[0]?.nameAr.error).toBe('A repeated amenity');
    });
    expect(result.current.frame.failure).toMatchObject({
      message: 'An amenity you ticked is no longer offered. Untick it, or reload the page.',
    });
    expect(client.getQueryState(['admin', 'lookups', 'amenities'])?.isInvalidated).toBe(true);
  });

  it('confirms its own group, and names it', async () => {
    const { result, writes } = renderSection(SPACE);

    act(() => {
      result.current.frame.confirm?.run();
    });

    await findToast('Amenities confirmed as still correct');
    expect(writes()[0]?.url).toBe('/admin/spaces/7/amenities/confirm');
  });

  it('keeps its unsaved changes when the space arrives again with its group changed elsewhere', async () => {
    const { result, rerender } = renderSection(SPACE);
    await addOwn(result, 'خزائن');

    rerender({ current: { ...SPACE, amenityIds: [1] } });

    expect(result.current.frame.unsaved).toBe('Unsaved changes');
    expect(result.current.own.rows).toHaveLength(2);
  });

  it('holds each row’s Remove while a save is pending', async () => {
    const answer = deferred<FakeAnswer>();
    const { result } = renderSection(MISSING, () => answer.promise);
    await addOwn(result, 'خزائن');

    save(result);

    await waitFor(() => {
      expect(result.current.frame.save.pending).toBe(true);
    });
    expect(result.current.own.rows[0]?.remove.disabled).toBe(true);
    await act(async () => {
      answer.resolve(ok(MISSING));
      await answer.promise;
    });
  });
});
