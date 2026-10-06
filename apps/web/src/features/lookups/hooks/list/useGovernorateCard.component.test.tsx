import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
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
import { useAreaRow } from './useAreaRow';
import { useGovernorateCard } from './useGovernorateCard';
import { useGovernoratesQuery } from './useGovernoratesQuery';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const RIMAL = { id: 5, governorateId: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal', isActive: true };
const NASR = { id: 6, governorateId: 2, nameAr: 'النصر', nameEn: 'An-Nasr', isActive: true };
const SHATI = { id: 7, governorateId: 2, nameAr: 'الشاطئ', nameEn: 'Ash-Shati', isActive: true };

const GAZA: AdminGovernorateWithAreas = {
  id: 2,
  nameAr: 'محافظة غزة',
  nameEn: 'Gaza City',
  isActive: true,
  areas: [RIMAL, NASR, SHATI],
};

const RAFAH: AdminGovernorateWithAreas = {
  id: 3,
  nameAr: 'محافظة رفح',
  nameEn: 'Rafah',
  isActive: true,
  areas: [
    { id: 8, governorateId: 3, nameAr: 'تل السلطان', nameEn: 'Tel as-Sultan', isActive: true },
  ],
};

// The fake server's list as it stands, and what the next list waits on before it is answered.
let list: AdminGovernorateWithAreas[];
let listWaitsOn: Promise<unknown> | null;

/**
 * Both cards and Gaza's three area rows, as the section renders them, each from the list as the
 * server last sent it.
 */
function useCards() {
  const { data = [GAZA, RAFAH] } = useGovernoratesQuery();
  const gaza = data.find(({ id }) => id === GAZA.id) ?? GAZA;
  const rafah = data.find(({ id }) => id === RAFAH.id) ?? RAFAH;
  const card = useGovernorateCard(gaza);
  const area = (index: number) => gaza.areas[index] ?? RIMAL;
  return {
    gaza: card,
    rafah: useGovernorateCard(rafah),
    areas: [
      useAreaRow({ governorate: gaza, area: area(0), index: 0, blocked: card.blocked }),
      useAreaRow({ governorate: gaza, area: area(1), index: 1, blocked: card.blocked }),
      useAreaRow({ governorate: gaza, area: area(2), index: 2, blocked: card.blocked }),
    ],
  };
}

/** The cards, the server answering the list from `list`, and every write with `write`. */
async function renderCards(
  write: (request: Request) => FakeAnswer | Promise<FakeAnswer>,
  wrapper = queryWrapper(),
) {
  const requests = fakeTransport(async (request) => {
    if (request.method !== 'get') return write(request);
    await listWaitsOn;
    return ok(list);
  });
  const rendered = renderHook(useCards, { wrapper });
  await waitFor(() => {
    expect(requests.length).toBeGreaterThan(0);
  });
  const lists = () => requests.filter(({ method }) => method === 'get').length;
  return { ...rendered, requests, lists };
}

/** Each row's arrows of a list, up then down, as disabled or not. */
const arrows = (rows: { controls: { up: { disabled: boolean }; down: { disabled: boolean } } }[]) =>
  rows.map(({ controls }) => [controls.up.disabled, controls.down.disabled]);

/** Each row's controls of a list, as waiting on the server or not. */
const waiting = (
  rows: {
    controls: { shown: { waiting: boolean }; up: { waiting: boolean }; down: { waiting: boolean } };
  }[],
) =>
  rows.map(({ controls }) => [controls.shown.waiting, controls.up.waiting, controls.down.waiting]);

beforeEach(() => {
  startPreferences('en');
  list = [GAZA, RAFAH];
  listWaitsOn = null;
});

afterEach(() => {
  restoreTransport();
});

describe('useGovernorateCard and useAreaRow', () => {
  it('names each control after its row, in the interface’s language', async () => {
    startPreferences('ar');
    const { result } = await renderCards(() => ok({}));

    expect(result.current.areas[0]?.controls.shown.label).toBe('ظاهرة: ⁨الرمال⁩');
    expect(result.current.areas[0]?.controls.up.label).toBe('تحريك لأعلى: ⁨الرمال⁩');
    expect(result.current.gaza.controls.down.label).toBe('تحريك لأسفل: ⁨محافظة غزة⁩');
  });

  it('disables the first row’s up arrow and the last row’s down arrow, in each list', async () => {
    const { result } = await renderCards(() => ok({}));
    const { gaza, rafah, areas } = result.current;

    expect(arrows([gaza, rafah])).toEqual([
      [true, false],
      [false, true],
    ]);
    expect(arrows(areas)).toEqual([
      [true, false],
      [false, false],
      [false, true],
    ]);
  });

  it('hides an area with its PATCH, its row waiting until the list is fetched again while the others do not', async () => {
    const listHeld = deferred<undefined>();
    const { result, requests, lists } = await renderCards(() => {
      list = [{ ...GAZA, areas: [{ ...RIMAL, isActive: false }, NASR, SHATI] }, RAFAH];
      listWaitsOn = listHeld.promise;
      return ok({ ...RIMAL, isActive: false });
    });

    act(() => {
      result.current.areas[0]?.controls.shown.toggle(false);
    });

    // The PATCH is answered and the list asked for again; the row waits for it.
    await waitFor(() => {
      expect(lists()).toBe(2);
    });
    expect(requests[1]).toMatchObject({ method: 'patch', url: '/admin/areas/5' });
    expect(bodyOf(requests[1])).toEqual({ isActive: false });
    expect(result.current.areas[0]?.controls.shown.checked).toBe(true);
    expect(waiting(result.current.areas)).toEqual([
      [true, true, true],
      [false, false, false],
      [false, false, false],
    ]);
    expect(waiting([result.current.gaza])).toEqual([[false, false, false]]);

    listHeld.resolve(undefined);
    await waitFor(() => {
      expect(result.current.areas[0]?.controls.shown.waiting).toBe(false);
    });
    expect(result.current.areas[0]?.controls.shown.checked).toBe(false);
    expect(result.current.areas[0]?.hidden).toBe(true);
  });

  it('restores a governorate with its PATCH', async () => {
    list = [{ ...GAZA, isActive: false }, RAFAH];
    const { result, requests } = await renderCards(() => {
      list = [GAZA, RAFAH];
      return ok({ ...GAZA, areas: undefined });
    });
    await waitFor(() => {
      expect(result.current.gaza.hidden).toBe(true);
    });

    act(() => {
      result.current.gaza.controls.shown.toggle(true);
    });

    await waitFor(() => {
      expect(result.current.gaza.hidden).toBe(false);
    });
    expect(requests[1]).toMatchObject({ method: 'patch', url: '/admin/governorates/2' });
    expect(bodyOf(requests[1])).toEqual({ isActive: true });
  });

  it('moves an area with the whole new order, every arrow of its list waiting until the list is fetched again', async () => {
    const answered = deferred<FakeAnswer>();
    const { result, requests } = await renderCards(() => answered.promise);

    act(() => {
      result.current.areas[1]?.controls.up.move();
    });

    await waitFor(() => {
      expect(waiting(result.current.areas).map(([, up, down]) => [up, down])).toEqual([
        [true, true],
        [true, true],
        [true, true],
      ]);
    });
    expect(requests[1]).toMatchObject({ method: 'put', url: '/admin/governorates/2/areas/order' });
    expect(bodyOf(requests[1])).toEqual({ ids: [6, 5, 7] });
    // The other rows' switches, and the governorates' own arrows, do not wait for it.
    expect(result.current.areas[0]?.controls.shown.waiting).toBe(false);
    expect(result.current.gaza.controls.down.waiting).toBe(false);

    list = [{ ...GAZA, areas: [NASR, RIMAL, SHATI] }, RAFAH];
    answered.resolve({ status: 204 });
    await waitFor(() => {
      expect(result.current.areas.map(({ nameEn }) => nameEn)).toEqual([
        'An-Nasr',
        'Al-Rimal',
        'Ash-Shati',
      ]);
    });
    expect(waiting(result.current.areas)).toEqual([
      [false, false, false],
      [false, false, false],
      [false, false, false],
    ]);
  });

  it('moves a governorate with the whole new order, every governorate’s arrows waiting meanwhile', async () => {
    const answered = deferred<FakeAnswer>();
    const { result, requests } = await renderCards(() => answered.promise);

    act(() => {
      result.current.gaza.controls.down.move();
    });

    await waitFor(() => {
      expect(result.current.rafah.controls.up.waiting).toBe(true);
    });
    expect(result.current.gaza.controls.down.waiting).toBe(true);
    expect(requests[1]).toMatchObject({ method: 'put', url: '/admin/governorates/order' });
    expect(bodyOf(requests[1])).toEqual({ ids: [3, 2] });
    expect(result.current.areas[1]?.controls.up.waiting).toBe(false);

    answered.resolve({ status: 204 });
    await waitFor(() => {
      expect(result.current.gaza.controls.down.waiting).toBe(false);
    });
  });

  it('keeps a row’s failure while another row’s action succeeds, until the next action on that row', async () => {
    let shati: Promise<FakeAnswer> | FakeAnswer = deferred<FakeAnswer>().promise;
    const shatiAnswered = deferred<FakeAnswer>();
    shati = shatiAnswered.promise;
    const { result } = await renderCards((request) =>
      request.url === '/admin/areas/7' ? shati : ok({ ...NASR, isActive: false }),
    );

    act(() => {
      result.current.areas[2]?.controls.shown.toggle(false);
    });
    act(() => {
      result.current.areas[1]?.controls.shown.toggle(false);
    });
    await waitFor(() => {
      expect(result.current.areas[1]?.controls.shown.waiting).toBe(false);
    });
    shatiAnswered.resolve(refused(404, { type: 'not_found' }));

    await waitFor(() => {
      expect(result.current.gaza.failure).toMatchObject({
        kind: 'refused',
        title: 'The change wasn’t saved',
        message: 'We couldn’t find what you were looking for.',
        reference: expect.stringContaining('req-1') as string,
      });
    });
    expect(result.current.rafah.failure).toBeNull();

    act(() => {
      result.current.areas[1]?.controls.shown.toggle(true);
    });
    await waitFor(() => {
      expect(result.current.areas[1]?.controls.shown.waiting).toBe(false);
    });
    expect(result.current.gaza.failure).not.toBeNull();

    shati = ok({ ...SHATI, isActive: false });
    act(() => {
      result.current.areas[2]?.controls.shown.toggle(false);
    });
    await waitFor(() => {
      expect(result.current.gaza.failure).toBeNull();
    });
  });

  it('shows no failure from before, once the cards are left and opened again', async () => {
    const wrapper = queryWrapper();
    const { result, unmount } = await renderCards(
      () => refused(404, { type: 'not_found' }),
      wrapper,
    );
    act(() => {
      result.current.areas[0]?.controls.shown.toggle(false);
    });
    await waitFor(() => {
      expect(result.current.gaza.failure).not.toBeNull();
    });

    unmount();
    // Coming back takes longer than the cache's moment to let go of an action no row holds.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    const again = renderHook(useCards, { wrapper });

    expect(again.result.current.gaza.failure).toBeNull();
  });

  it('holds every control of the card while it waits out too many requests, and only that card', async () => {
    const { result } = await renderCards(() =>
      refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }),
    );

    act(() => {
      result.current.areas[0]?.controls.shown.toggle(false);
    });

    await waitFor(() => {
      expect(result.current.gaza.failure).toEqual({
        kind: 'rateLimit',
        message: 'Too many attempts. Try again in ⁦0:30⁩.',
      });
    });
    expect(waiting([result.current.gaza, ...result.current.areas])).toEqual([
      [true, true, true],
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ]);
    expect(waiting([result.current.rafah])).toEqual([[false, false, false]]);
  });

  it('fetches the list again when an order conflicts, and says the order changed', async () => {
    const { result, lists } = await renderCards(() => {
      list = [{ ...GAZA, areas: [SHATI, RIMAL, NASR] }, RAFAH];
      return refused(409, { type: 'conflict' });
    });

    act(() => {
      result.current.areas[0]?.controls.down.move();
    });

    await waitFor(() => {
      expect(result.current.gaza.failure).toEqual({
        kind: 'refused',
        title: 'The change wasn’t saved',
        message: 'The order changed meanwhile; the new order is shown. Try again.',
      });
    });
    expect(lists()).toBe(2);
    expect(result.current.areas.map(({ nameEn }) => nameEn)).toEqual([
      'Ash-Shati',
      'Al-Rimal',
      'An-Nasr',
    ]);
  });
});
