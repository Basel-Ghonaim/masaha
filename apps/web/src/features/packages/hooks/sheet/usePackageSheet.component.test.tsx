import type { SpacePackage } from '@masaha/shared/packages';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, waitFor } from '@testing-library/react';
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
import { findToast } from '../../../../test/findToast';
import { startPreferences } from '../../../../test/startPreferences';
import type { ShiftChoice } from '../../types/ShiftChoice';
import { usePackagesQuery } from '../list/usePackagesQuery';
import { usePackageSheet } from './usePackageSheet';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];
type Sheet = ReturnType<typeof usePackageSheet>;

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
  shiftId: null,
  isActive: true,
};

/**
 * The sheet of space 7, beside the list it saves to and the space's own read, a new package's or
 * `editing`'s; the server answers the list with `[TEN_DAYS]`, every write with `write`.
 */
async function renderSheet(
  write: (request: Request) => FakeAnswer | Promise<FakeAnswer>,
  editing: SpacePackage | null = null,
) {
  const close = vi.fn();
  const requests = fakeTransport((request) =>
    request.method === 'get' ? ok([TEN_DAYS]) : write(request),
  );
  const client = createQueryClient();
  // The space as `spaces` keeps it, under the space's scope, so a refresh of the scope is seen; the
  // owner's own spaces as `space-links` keeps them, under the user's.
  client.setQueryData(['space', 7, 'spaces', 'space'], { id: 7 });
  client.setQueryData(['me', 'spaces'], []);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(
    ({ shifts }: { shifts: ShiftChoice[] }) => ({
      list: usePackagesQuery(7),
      sheet: usePackageSheet({ spaceId: 7, editing, shifts, hoursLink: '/hours', close }),
    }),
    { wrapper, initialProps: { shifts: SHIFTS } },
  );
  await waitFor(() => {
    expect(rendered.result.current.list.isSuccess).toBe(true);
  });
  return { ...rendered, requests, close, client };
}

/** Types `value` into a field, as the user would. */
async function type(binding: Sheet['name']['binding'], value: string) {
  await act(async () => {
    await binding.onChange({ target: { name: binding.name, value } });
  });
}

/** Sends the sheet and lets the check run. */
async function send(result: { current: { sheet: Sheet } }) {
  await act(async () => {
    result.current.sheet.submit();
    await Promise.resolve();
  });
}

/** Fills a new package that the contract takes: a name and a price. */
async function fillValid(result: { current: { sheet: Sheet } }, name = 'Monthly') {
  await type(result.current.sheet.name.binding, name);
  await type(result.current.sheet.amount.binding, '150');
}

const writes = (requests: Request[]) => requests.filter(({ method }) => method !== 'get');

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

describe('usePackageSheet', () => {
  it('refuses in the browser a missing name, a validity of 0, 8 days a week, a price of 0, and a limit on but empty, sending nothing', async () => {
    const { result, requests } = await renderSheet(() => ok(TEN_DAYS, 201));
    await type(result.current.sheet.validity.binding, '0');
    await type(result.current.sheet.amount.binding, '0');
    act(() => {
      result.current.sheet.limits.choose(['daysPerWeek', 'totalHours']);
    });
    await type(result.current.sheet.limits.fields[0]?.binding as Sheet['name']['binding'], '8');

    await send(result);

    await waitFor(() => {
      expect(result.current.sheet.name.error).toBe('Enter the package name');
    });
    const { sheet } = result.current;
    expect(sheet.validity.error).toBe('A whole number from 1');
    expect(sheet.limits.fields.map(({ name, error }) => [name, error])).toEqual([
      ['daysPerWeek', 'From 1 to 7'],
      ['totalHours', 'Enter the number, or turn this limit off'],
    ]);
    expect(sheet.amount.error).toBe('Enter an amount above zero, up to ₪100,000');
    expect(writes(requests)).toEqual([]);
  });

  it('lands a repeated name (409) on its field', async () => {
    const { result, close } = await renderSheet(() =>
      refused(409, { type: 'conflict', errors: { name: ['not_unique'] } }),
    );
    await fillValid(result, '10 days');

    await send(result);

    await waitFor(() => {
      expect(result.current.sheet.name.error).toBe('Another package, paused or not, has this name');
    });
    expect(close).not.toHaveBeenCalled();
  });

  it('fetches the space’s scope again when its shift is gone (422)', async () => {
    const { result, client } = await renderSheet(() =>
      refused(422, { type: 'validation', errors: { shiftId: ['invalid_choice'] } }),
    );
    await fillValid(result);
    const chips = result.current.sheet.shift.state;
    act(() => {
      if (chips.kind === 'chips') chips.choose('2');
    });

    await send(result);

    await waitFor(() => {
      expect(result.current.sheet.shift.error).toBe('This shift no longer exists; choose another.');
    });
    expect(client.getQueryState(['space', 7, 'spaces', 'space'])?.isInvalidated).toBe(true);
  });

  it('lets a new package go on without a shift removed meanwhile, its last one', async () => {
    let answer: () => FakeAnswer = () =>
      refused(422, { type: 'validation', errors: { shiftId: ['invalid_choice'] } });
    const { result, requests, rerender } = await renderSheet(() => answer());
    await fillValid(result);
    const chips = result.current.sheet.shift.state;
    act(() => {
      if (chips.kind === 'chips') chips.choose('2');
    });
    await send(result);
    await waitFor(() => {
      expect(result.current.sheet.shift.error).toBe('This shift no longer exists; choose another.');
    });

    // The space arrives again with no shift left: no chip remains to clear the one chosen.
    rerender({ shifts: [] });
    answer = () => ok(TEN_DAYS, 201);
    await send(result);

    await waitFor(() => {
      expect(writes(requests)).toHaveLength(2);
    });
    expect(bodyOf(writes(requests)[1])).toMatchObject({ shiftId: null });
  });

  it('says a new package refused 404 is a space no longer the owner’s, and fetches their spaces again', async () => {
    const { result, client } = await renderSheet(() => refused(404, { type: 'not_found' }));
    await fillValid(result);

    await send(result);

    await waitFor(() => {
      expect(result.current.sheet.failure).toMatchObject({
        message: 'This space is no longer available to you.',
      });
    });
    expect(client.getQueryState(['me', 'spaces'])?.isInvalidated).toBe(true);
  });

  it('sends the terms whole on an edit, a limit turned off as none', async () => {
    const { result, requests } = await renderSheet(() => ok(TEN_DAYS), TEN_DAYS);
    act(() => {
      result.current.sheet.limits.choose([]);
    });

    await send(result);

    await waitFor(() => {
      expect(writes(requests)).toHaveLength(1);
    });
    const [edit] = writes(requests);
    expect(`${String(edit?.method)} ${String(edit?.url)}`).toBe(
      'patch /manage/spaces/7/packages/3',
    );
    expect(bodyOf(edit)).toEqual({
      name: '10 days',
      validityDays: 30,
      totalDays: null,
      daysPerWeek: null,
      hoursPerDay: null,
      totalHours: null,
      billing: 'FIXED',
      priceAgorot: 15000,
      audience: 'GENERAL',
      shiftId: null,
    });
  });

  it('closes and toasts once the list has arrived again', async () => {
    const { result, requests, close } = await renderSheet(() => ok(TEN_DAYS, 201));
    // The list's reads when the sheet closes: the first, then the one after the save.
    let listedAtClose = 0;
    close.mockImplementation(() => {
      listedAtClose = requests.filter(({ method }) => method === 'get').length;
    });
    await fillValid(result);

    await send(result);

    await waitFor(() => {
      expect(close).toHaveBeenCalledTimes(1);
    });
    expect(listedAtClose).toBe(2);
    expect(bodyOf(writes(requests)[0])).toMatchObject({ name: 'Monthly', priceAgorot: 15000 });
    expect(await findToast(/Package .*10 days.* saved/)).toBeInTheDocument();
  });
});
