import type { SpacePackage } from '@masaha/shared/packages';
import { Toaster, toast } from '@shared/design-system';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import type { ShiftChoice } from '../../types/ShiftChoice';
import { usePackagesSection } from './usePackagesSection';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const SHIFTS: ShiftChoice[] = [{ id: 2, nameAr: 'صباحي', nameEn: 'Morning' }];

const TEN_DAYS: SpacePackage = {
  id: 3,
  name: '10 days',
  validityDays: 30,
  totalDays: 10,
  daysPerWeek: null,
  hoursPerDay: null,
  totalHours: null,
  billing: 'FIXED',
  priceAgorot: 15000,
  audience: 'GENERAL',
  shiftId: 2,
  isActive: true,
};

/** Paused, and still holding the morning shift (finding 81). */
const MORNING: SpacePackage = {
  ...TEN_DAYS,
  id: 4,
  name: 'Morning',
  totalDays: null,
  billing: 'PER_HOUR',
  priceAgorot: 500,
  isActive: false,
};

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (name: string) => name.replace(/[\u2066-\u2069]/g, '');

/** The section of space 7, its list answered `[TEN_DAYS, MORNING]`, every write with `write`. */
function renderSection(write: (request: Request) => FakeAnswer | Promise<FakeAnswer>) {
  const requests = fakeTransport((request) =>
    request.method === 'get' ? ok([TEN_DAYS, MORNING]) : write(request),
  );
  const rendered = renderHook(() => usePackagesSection({ spaceId: 7, shifts: SHIFTS }), {
    wrapper: queryWrapper(),
  });
  return { ...rendered, requests };
}

/** Waits for the list, and hands back its rows. */
async function rowsOf(result: { current: ReturnType<typeof usePackagesSection> }) {
  await waitFor(() => {
    expect(result.current.status).toBe('ready');
  });
  return result.current.rows;
}

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

describe('usePackagesSection', () => {
  it('lists the packages in order, a paused one marked «موقوفة», each switch and edit named by its package', async () => {
    startPreferences('ar');
    const { result } = renderSection(() => ok(TEN_DAYS));

    const rows = await rowsOf(result);
    expect(rows.map(({ name, paused, available }) => [name, paused, available.checked])).toEqual([
      ['10 days', null, true],
      ['Morning', 'موقوفة', false],
    ]);
    expect(rows[0]?.summary).toBe('صالحة 30 يومًا · 10 أيام · صباحي');
    expect(heard(rows[1]?.available.name ?? '')).toBe('Morning: متاحة');
    expect(heard(rows[1]?.edit.name ?? '')).toBe('تعديل Morning');
  });

  it('holds the switch while its change waits, then replaces the row from the answer', async () => {
    let answer: (value: FakeAnswer) => void = () => undefined;
    const { result, requests } = renderSection(
      () =>
        new Promise<FakeAnswer>((resolve) => {
          answer = resolve;
        }),
    );
    const [first] = await rowsOf(result);

    act(() => {
      first?.available.toggle(false);
    });
    await waitFor(() => {
      expect(result.current.rows[0]?.available.pending).toBe(true);
    });
    // A press while it waits sends nothing more.
    act(() => {
      result.current.rows[0]?.available.toggle(true);
    });
    expect(requests.filter(({ method }) => method === 'patch')).toHaveLength(1);
    expect(bodyOf(requests.find(({ method }) => method === 'patch'))).toEqual({ isActive: false });
    expect(result.current.rows[1]?.available.pending).toBe(false);

    act(() => {
      answer(ok({ ...TEN_DAYS, isActive: false }));
    });
    await waitFor(() => {
      expect(result.current.rows[0]?.paused).toBe('Paused');
    });
    expect(result.current.rows[0]?.available.pending).toBe(false);
    // The answer is the list's: nothing is read again.
    expect(requests.filter(({ method }) => method === 'get')).toHaveLength(1);
  });

  it('says a refused switch in a toast that stays, naming the package', async () => {
    const { result } = renderSection(() => refused(500, { type: 'internal' }));
    const [first] = await rowsOf(result);

    act(() => {
      first?.available.toggle(false);
    });

    const shown = await findToast(/Couldn’t change whether .*10 days.* is offered/);
    expect(shown).toBeInTheDocument();
    expect(result.current.rows[0]?.available.checked).toBe(true);
  });

  it('offers a paused package that keeps its shift «إزالة الوردية», and no other package', async () => {
    startPreferences('ar');
    const { result, requests } = renderSection(() => ok({ ...MORNING, shiftId: null }));
    const rows = await rowsOf(result);

    expect(rows[0]?.heldShift).toBeNull();
    expect(heard(rows[1]?.heldShift?.text ?? '')).toBe(
      'موقوفة وما زالت تحجز وردية «صباحي»؛ لا تُحذف الوردية قبل إزالتها منها.',
    );
    act(() => {
      rows[1]?.heldShift?.clear.run();
    });

    await waitFor(() => {
      expect(result.current.rows[1]?.heldShift).toBeNull();
    });
    const patch = requests.find(({ method }) => method === 'patch');
    expect(patch?.url).toBe('/manage/spaces/7/packages/4');
    expect(bodyOf(patch)).toEqual({ shiftId: null });
  });

  it('is empty, with the way to the first package, or failed with its reference and a retry', async () => {
    fakeTransport(() => ok([]));
    const empty = renderHook(() => usePackagesSection({ spaceId: 7, shifts: SHIFTS }), {
      wrapper: queryWrapper(),
    });
    await waitFor(() => {
      expect(empty.result.current.status).toBe('empty');
    });
    expect(empty.result.current.empty.title).toBe('No private packages');

    let fail = true;
    fakeTransport(() => (fail ? refused(404, { type: 'not_found' }) : ok([TEN_DAYS])));
    const failed = renderHook(() => usePackagesSection({ spaceId: 7, shifts: SHIFTS }), {
      wrapper: queryWrapper(),
    });
    await waitFor(() => {
      expect(failed.result.current.status).toBe('error');
    });
    expect(failed.result.current.failure.reference).toMatch(/req-1/);
    fail = false;
    act(() => {
      failed.result.current.failure.retry();
    });
    await waitFor(() => {
      expect(failed.result.current.status).toBe('ready');
    });
  });
});
