import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { customerRow, customersPage } from '../../../../test/deskCustomer';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { useDeskSearch } from './useDeskSearch';

const SARA = customerRow({ id: 4, name: 'Sara Khalid' });
const SAMIR = customerRow({ id: 5, name: 'Samir Odeh', phone: '+970599000205' });

/** Sara is present now; `presentMatches` counts the people present a term finds. */
function renderSearch(
  answer: Parameters<typeof fakeTransport>[0],
  presentMatches: (term: string) => number = () => 0,
) {
  const requests = fakeTransport(answer);
  const hook = renderHook(
    () =>
      useDeskSearch(7, {
        present: { customerIds: new Set([4]), matches: presentMatches },
      }),
    { wrapper: queryWrapper() },
  );
  return { ...hook, requests };
}

/** Types the text as the field would, then lets `ms` pass. */
async function type(result: { current: ReturnType<typeof useDeskSearch> }, text: string, ms = 0) {
  act(() => {
    result.current.input.change(text);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  await settle();
}

/** Lets `ms` pass, then the answers it brings land. */
async function pass(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  await settle();
}

/** Lets the answers already sent land: the transport's promises, then the cache's notices. */
async function settle() {
  for (let round = 0; round < 5; round += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  startPreferences('en');
  stubScreenWidth(1440);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  restoreTransport();
});

describe('useDeskSearch', () => {
  it('asks the server only once typing pauses, leaves out the customers present, and makes the visit button primary only with no match', async () => {
    const { result, requests } = renderSearch(
      (request) =>
        (request.params as { q: string }).q === 'Sa'
          ? customersPage([SARA, SAMIR])
          : customersPage([]),
      (term) => (term === 'Sa' ? 1 : 0),
    );
    expect(result.current.customers.state).toBe('idle');
    expect(result.current.checkIn).toBeNull();

    await type(result, 'S', 100);
    await type(result, 'Sa', 399);
    expect(requests).toHaveLength(0);
    await type(result, 'Sa', 1);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe('/manage/spaces/7/customers');
    expect(requests[0]?.params).toEqual({ q: 'Sa', page: 1, limit: 6 });
    expect(result.current.term).toBe('Sa');
    expect(result.current.customers.rows.map((row) => row.name)).toEqual(['Samir Odeh']);
    expect(result.current.checkIn).toMatchObject({ name: 'Sa', primary: false });
    expect(result.current.checkIn?.label.replace(/[⁦-⁩]/g, '')).toBe('Check in a visit for “Sa”');
    expect(result.current.none).toBeNull();
    expect(result.current.count).toBe('2 results');

    await type(result, 'Zed', 400);
    expect(requests).toHaveLength(2);
    expect(result.current.customers.rows).toEqual([]);
    expect(result.current.checkIn).toMatchObject({ name: 'Zed', primary: true });
    expect(result.current.none).toEqual({
      title: 'No one by this name or number',
      text: 'A one-off visitor? Check them in as a visit (no customer file is created).',
    });
    expect(result.current.count).toBe('0 results');
  });

  it('offers a plain visit for digits, and counts the present who match', async () => {
    const { result } = renderSearch(
      () => customersPage([SARA]),
      () => 1,
    );

    await type(result, '0201', 400);
    expect(result.current.checkIn).toEqual({
      label: 'Check in a visit',
      name: '',
      primary: false,
    });
    expect(result.current.none).toBeNull();
    expect(result.current.count).toBe('1 result');
  });

  it('clears the search at once', async () => {
    const { result } = renderSearch(() => customersPage([SAMIR]));
    await type(result, 'Sam', 400);
    expect(result.current.customers.rows).toHaveLength(1);

    act(() => {
      result.current.input.clear();
    });
    expect(result.current.input.text).toBe('');
    expect(result.current.term).toBe('');
    expect(result.current.customers.state).toBe('idle');
  });

  it('says a failed search with a retry, never as no match', async () => {
    let fail = true;
    const { result } = renderSearch(() =>
      fail ? refused(500, { type: 'internal' }) : customersPage([SAMIR]),
    );

    // The transport sends a GET twice more, after 1 s and 2 s, before it fails.
    await type(result, 'Sam', 400);
    await pass(1_100);
    await pass(2_100);
    expect(result.current.customers.state).toBe('failed');
    expect(result.current.customers.failure.title).toBe('We couldn’t search the customers');
    expect(result.current.customers.failure.reference).toBeDefined();
    expect(result.current.none).toBeNull();
    expect(result.current.checkIn?.primary).toBe(false);

    fail = false;
    act(() => {
      result.current.customers.failure.retry();
    });
    await settle();
    expect(result.current.customers.state).toBe('ready');
    expect(result.current.customers.rows).toHaveLength(1);
  });

  it('says it is offline', async () => {
    const { result } = renderSearch(() => ({ failure: 'ERR_NETWORK' }));

    await type(result, 'Sam', 400);
    await pass(1_100);
    await pass(2_100);
    expect(result.current.customers.state).toBe('failed');
    expect(result.current.customers.failure.message).toBe(
      'No connection. Check your internet and try again.',
    );
    expect(result.current.none).toBeNull();
  });
});
