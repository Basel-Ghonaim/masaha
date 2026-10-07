import type { AdminAmenity } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useAmenitiesSection } from './useAmenitiesSection';
import { useAmenityRow } from './useAmenityRow';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const INTERNET: AdminAmenity = {
  id: 4,
  key: 'internet',
  nameAr: 'إنترنت',
  nameEn: 'Internet',
  icon: 'wifi',
  isActive: true,
  isFilterable: false,
};
const DRINKS: AdminAmenity = {
  id: 5,
  key: 'hot_drinks',
  nameAr: 'مشروبات ساخنة',
  nameEn: 'Hot drinks',
  icon: 'coffee',
  isActive: true,
  isFilterable: true,
};
const HALLS: AdminAmenity = {
  id: 6,
  key: 'halls_for_rent',
  nameAr: 'قاعات للإيجار',
  nameEn: 'Halls for rent',
  icon: 'presentation',
  isActive: false,
  isFilterable: true,
};

// The fake server's list as it stands, and what the next list waits on before it is answered.
let list: AdminAmenity[];
let listWaitsOn: Promise<unknown> | null;

/** The section and its three rows, as the section renders them, each from the list as last sent. */
function useRows() {
  const section = useAmenitiesSection();
  const amenity = (index: number) => section.amenities[index] ?? list[index] ?? INTERNET;
  return {
    section,
    rows: [
      useAmenityRow({ amenity: amenity(0), blocked: section.blocked }),
      useAmenityRow({ amenity: amenity(1), blocked: section.blocked }),
      useAmenityRow({ amenity: amenity(2), blocked: section.blocked }),
    ],
  };
}

/** The rows, the server answering the list from `list`, and every write with `write`. */
async function renderRows(
  write: (request: Request) => FakeAnswer | Promise<FakeAnswer>,
  wrapper = queryWrapper(),
) {
  const requests = fakeTransport(async (request) => {
    if (request.method !== 'get') return write(request);
    await listWaitsOn;
    return ok(list);
  });
  const rendered = renderHook(useRows, { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.section.status).toBe('ready');
  });
  const lists = () => requests.filter(({ method }) => method === 'get').length;
  return { ...rendered, requests, lists };
}

type Row = ReturnType<typeof useAmenityRow>;

/** Each row's controls, as waiting or not: its filter switch, its active switch, its two arrows. */
const waiting = (rows: Row[]) =>
  rows.map(({ controls }) => [
    controls.switches[0]?.waiting,
    controls.shown.waiting,
    controls.up.waiting,
    controls.down.waiting,
  ]);

beforeEach(() => {
  startPreferences('en');
  list = [INTERNET, DRINKS, HALLS];
  listWaitsOn = null;
});

afterEach(() => {
  restoreTransport();
});

describe('useAmenityRow', () => {
  it('names an amenity in the interface’s language first, the other as its second line', async () => {
    const { result } = await renderRows(() => ok({}));

    expect(result.current.rows[0]).toMatchObject({
      icon: 'wifi',
      name: { text: 'Internet', lang: 'en' },
      other: { text: 'إنترنت', lang: 'ar' },
    });
  });

  it('names an amenity in Arabic first in the Arabic interface, and its controls after it', async () => {
    startPreferences('ar');
    const { result } = await renderRows(() => ok({}));
    const [internet] = result.current.rows;

    expect(internet).toMatchObject({
      name: { text: 'إنترنت', lang: 'ar' },
      other: { text: 'Internet', lang: 'en' },
    });
    expect(internet?.controls.switches[0]?.label).toBe('في الفلاتر: ⁨إنترنت⁩');
    expect(internet?.controls.shown.label).toBe('نشط: ⁨إنترنت⁩');
    expect(internet?.controls.up.label).toBe('تحريك لأعلى: ⁨إنترنت⁩');
  });

  it('carries each switch’s words, its state, and the badges of a row left out of filters or retired', async () => {
    const { result } = await renderRows(() => ok({}));
    const [internet, drinks, halls] = result.current.rows;

    expect(internet?.controls.switches[0]).toMatchObject({ text: 'In filters', checked: false });
    expect(internet?.controls.shown).toMatchObject({ text: 'Active', checked: true });
    expect([internet, drinks, halls].map((row) => [row?.notFiltered, row?.inactive])).toEqual([
      [true, false],
      [false, false],
      [false, true],
    ]);
    expect(halls?.controls.shown.checked).toBe(false);
  });

  it('disables the first row’s up arrow and the last row’s down arrow', async () => {
    const { result } = await renderRows(() => ok({}));

    expect(
      result.current.rows.map(({ controls }) => [controls.up.disabled, controls.down.disabled]),
    ).toEqual([
      [true, false],
      [false, false],
      [false, true],
    ]);
  });

  it('puts an amenity in the filters with its PATCH, only its filter switch waiting until the list is fetched again', async () => {
    const listHeld = deferred<undefined>();
    const { result, requests, lists } = await renderRows(() => {
      list = [{ ...INTERNET, isFilterable: true }, DRINKS, HALLS];
      listWaitsOn = listHeld.promise;
      return ok({ ...INTERNET, isFilterable: true });
    });

    act(() => {
      result.current.rows[0]?.controls.switches[0]?.toggle(true);
    });

    await waitFor(() => {
      expect(lists()).toBe(2);
    });
    expect(requests[1]).toMatchObject({ method: 'patch', url: '/admin/amenities/4' });
    expect(bodyOf(requests[1])).toEqual({ isFilterable: true });
    expect(result.current.rows[0]?.controls.switches[0]?.checked).toBe(false);
    expect(waiting(result.current.rows)).toEqual([
      [true, false, false, false],
      [false, false, false, false],
      [false, false, false, false],
    ]);

    listHeld.resolve(undefined);
    await waitFor(() => {
      expect(result.current.rows[0]?.controls.switches[0]?.waiting).toBe(false);
    });
    expect(result.current.rows[0]?.controls.switches[0]?.checked).toBe(true);
    expect(result.current.rows[0]?.notFiltered).toBe(false);
  });

  it('retires an amenity with its PATCH, only its active switch waiting until the list is fetched again', async () => {
    const listHeld = deferred<undefined>();
    const { result, requests, lists } = await renderRows(() => {
      list = [INTERNET, { ...DRINKS, isActive: false }, HALLS];
      listWaitsOn = listHeld.promise;
      return ok({ ...DRINKS, isActive: false });
    });

    act(() => {
      result.current.rows[1]?.controls.shown.toggle(false);
    });

    await waitFor(() => {
      expect(lists()).toBe(2);
    });
    expect(requests[1]).toMatchObject({ method: 'patch', url: '/admin/amenities/5' });
    expect(bodyOf(requests[1])).toEqual({ isActive: false });
    expect(waiting(result.current.rows)).toEqual([
      [false, false, false, false],
      [false, true, false, false],
      [false, false, false, false],
    ]);

    listHeld.resolve(undefined);
    await waitFor(() => {
      expect(result.current.rows[1]?.inactive).toBe(true);
    });
    expect(result.current.rows[1]?.controls.shown.waiting).toBe(false);
  });

  it('moves an amenity with the whole new order, every arrow waiting until the list is fetched again, the switches not', async () => {
    const answered = deferred<FakeAnswer>();
    const { result, requests } = await renderRows(() => answered.promise);

    act(() => {
      result.current.rows[0]?.controls.down.move();
    });

    await waitFor(() => {
      expect(waiting(result.current.rows)).toEqual([
        [false, false, true, true],
        [false, false, true, true],
        [false, false, true, true],
      ]);
    });
    expect(requests[1]).toMatchObject({ method: 'put', url: '/admin/amenities/order' });
    expect(bodyOf(requests[1])).toEqual({ ids: [5, 4, 6] });

    list = [DRINKS, INTERNET, HALLS];
    answered.resolve({ status: 204 });
    await waitFor(() => {
      expect(result.current.rows.map(({ name }) => name.text)).toEqual([
        'Hot drinks',
        'Internet',
        'Halls for rent',
      ]);
    });
    expect(waiting(result.current.rows)).toEqual([
      [false, false, false, false],
      [false, false, false, false],
      [false, false, false, false],
    ]);
  });

  it('keeps a row’s failure in that row while another row’s action succeeds, until the next action on that row', async () => {
    let halls: Promise<FakeAnswer> | FakeAnswer = deferred<FakeAnswer>().promise;
    const hallsAnswered = deferred<FakeAnswer>();
    halls = hallsAnswered.promise;
    const { result } = await renderRows((request) =>
      request.url === '/admin/amenities/6' ? halls : ok({ ...DRINKS, isActive: false }),
    );

    act(() => {
      result.current.rows[2]?.controls.shown.toggle(true);
    });
    act(() => {
      result.current.rows[1]?.controls.shown.toggle(false);
    });
    await waitFor(() => {
      expect(result.current.rows[1]?.controls.shown.waiting).toBe(false);
    });
    hallsAnswered.resolve(refused(404, { type: 'not_found' }));

    await waitFor(() => {
      expect(result.current.rows[2]?.failure).toMatchObject({
        kind: 'refused',
        title: 'The change wasn’t saved',
        message: 'We couldn’t find what you were looking for.',
      });
    });
    expect(result.current.rows[1]?.failure).toBeNull();
    expect(result.current.section.orderFailure).toBeNull();

    act(() => {
      result.current.rows[1]?.controls.switches[0]?.toggle(false);
    });
    await waitFor(() => {
      expect(result.current.rows[1]?.controls.switches[0]?.waiting).toBe(false);
    });
    expect(result.current.rows[2]?.failure).not.toBeNull();

    // The next action on that row, by its other switch, replaces the failure.
    halls = ok({ ...HALLS, isFilterable: false });
    act(() => {
      result.current.rows[2]?.controls.switches[0]?.toggle(false);
    });
    await waitFor(() => {
      expect(result.current.rows[2]?.failure).toBeNull();
    });
  });

  it('keeps each row’s own failure when another row’s action fails after it', async () => {
    const { result } = await renderRows((request) =>
      request.url === '/admin/amenities/4'
        ? refused(404, { type: 'not_found' })
        : refused(403, { type: 'forbidden' }),
    );

    act(() => {
      result.current.rows[0]?.controls.shown.toggle(false);
    });
    await waitFor(() => {
      expect(result.current.rows[0]?.failure).not.toBeNull();
    });
    act(() => {
      result.current.rows[1]?.controls.switches[0]?.toggle(false);
    });

    await waitFor(() => {
      expect(result.current.rows[1]?.failure).toMatchObject({
        message: 'You don’t have permission to do this.',
      });
    });
    expect(result.current.rows[0]?.failure).toMatchObject({
      message: 'We couldn’t find what you were looking for.',
    });
    expect(result.current.rows[2]?.failure).toBeNull();
    expect(result.current.section.orderFailure).toBeNull();
  });

  it('shows no failure from before, once the rows are left and opened again', async () => {
    const wrapper = queryWrapper();
    const { result, unmount } = await renderRows(
      () => refused(404, { type: 'not_found' }),
      wrapper,
    );
    act(() => {
      result.current.rows[0]?.controls.shown.toggle(false);
    });
    await waitFor(() => {
      expect(result.current.rows[0]?.failure).not.toBeNull();
    });

    unmount();
    // Coming back takes longer than the cache's moment to let go of an action no row holds.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    const again = renderHook(useRows, { wrapper });

    expect(again.result.current.rows[0]?.failure).toBeNull();
  });

  it('holds every control of every row while it waits out too many requests', async () => {
    const { result } = await renderRows(() =>
      refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }),
    );

    act(() => {
      result.current.rows[0]?.controls.switches[0]?.toggle(true);
    });

    await waitFor(() => {
      expect(result.current.rows[0]?.failure).toEqual({
        kind: 'rateLimit',
        message: 'Too many attempts. Try again in ⁦0:30⁩.',
      });
    });
    expect(waiting(result.current.rows)).toEqual([
      [true, true, true, true],
      [true, true, true, true],
      [true, true, true, true],
    ]);
  });

  it('still holds every control while one row waits out too many requests, after another row fails otherwise', async () => {
    const { result } = await renderRows((request) =>
      request.url === '/admin/amenities/4'
        ? refused(429, { type: 'rate_limit' }, { 'retry-after': '30' })
        : refused(404, { type: 'not_found' }),
    );

    act(() => {
      result.current.rows[0]?.controls.switches[0]?.toggle(true);
    });
    await waitFor(() => {
      expect(result.current.rows[0]?.failure).toMatchObject({ kind: 'rateLimit' });
    });
    act(() => {
      result.current.rows[1]?.controls.shown.toggle(false);
    });

    await waitFor(() => {
      expect(result.current.rows[1]?.failure).toMatchObject({ kind: 'refused' });
    });
    expect(waiting(result.current.rows)).toEqual([
      [true, true, true, true],
      [true, true, true, true],
      [true, true, true, true],
    ]);
  });

  it('fetches the list again when an order conflicts, and says the order changed, for the list', async () => {
    const { result, lists } = await renderRows(() => {
      list = [HALLS, INTERNET, DRINKS];
      return refused(409, { type: 'conflict' });
    });

    act(() => {
      result.current.rows[0]?.controls.down.move();
    });

    await waitFor(() => {
      expect(result.current.section.orderFailure).toEqual({
        kind: 'refused',
        title: 'The change wasn’t saved',
        message: 'The order changed meanwhile; the new order is shown. Try again.',
      });
    });
    expect(lists()).toBe(2);
    expect(result.current.rows.map(({ name }) => name.text)).toEqual([
      'Halls for rent',
      'Internet',
      'Hot drinks',
    ]);
    expect(result.current.rows.map(({ failure }) => failure)).toEqual([null, null, null]);
  });
});
