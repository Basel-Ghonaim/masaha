import type { SpaceOccupancyNow } from '@masaha/shared/occupancy';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { usePresentList } from './usePresentList';

const NOW: SpaceOccupancyNow = {
  status: 'AVAILABLE',
  capacity: 40,
  present: 3,
  override: null,
  people: [
    {
      kind: 'VISIT',
      id: 12,
      name: 'Omar',
      since: '2026-07-01T07:00:00.000Z',
      chargeNowAgorot: 1250,
    },
    { kind: 'CHECK_IN', id: 3, customerId: 4, name: 'Sara', since: '2026-07-01T08:30:00.000Z' },
    {
      kind: 'VISIT',
      id: 13,
      name: 'Layla',
      since: '2026-07-01T09:00:00.000Z',
      chargeNowAgorot: null,
    },
  ],
};

/** Ten past nine, UTC: Gaza's 12:10 in summer. */
const CLOCK = new Date('2026-07-01T09:10:30.000Z');

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (line: string | null) => line?.replace(/[⁦-⁩]/g, '') ?? null;

function renderList(answer: Parameters<typeof fakeTransport>[0]) {
  const client = createQueryClient();
  fakeTransport(answer);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => usePresentList(7, { now: CLOCK }), { wrapper });
  return { ...hook, client };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('usePresentList', () => {
  it('lists people in the server’s order with kind, since and a visit’s charge so far from the server; «Set at check-out» with none', async () => {
    const { result } = renderList(() => ok(NOW));

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(result.current.heading).toEqual({ title: 'Present now', count: '3 / 40' });
    expect(result.current.label).toBe('People present');
    expect(
      result.current.rows.map((row) => ({
        key: row.key,
        name: row.name,
        kind: row.kind,
        since: row.since,
        duration: row.duration,
        detail: heard(row.detail),
      })),
    ).toEqual([
      {
        key: 'VISIT-12',
        name: 'Omar',
        kind: 'Visit',
        since: 'Since 10:00',
        duration: '2h 10m',
        detail: '₪12.50 so far',
      },
      {
        key: 'CHECK_IN-3',
        name: 'Sara',
        kind: 'Subscription',
        since: 'Since 11:30',
        duration: '40m',
        detail: null,
      },
      {
        key: 'VISIT-13',
        name: 'Layla',
        kind: 'Visit',
        since: 'Since 12:00',
        duration: '10m',
        detail: 'Set at check-out',
      },
    ]);
    expect(result.current.summary).toBe('1 subscriber · 2 visits');
  });

  it('counts the people present alone when the space has no capacity', async () => {
    const { result } = renderList(() => ok({ ...NOW, capacity: null, status: null }));

    await waitFor(() => {
      expect(result.current.heading).toEqual({ title: 'Present now', count: '3' });
    });
  });

  it('is loading, then empty with its own words', async () => {
    const { result } = renderList(() => ok({ ...NOW, present: 0, people: [] }));

    expect(result.current.state).toBe('loading');
    await waitFor(() => {
      expect(result.current.state).toBe('empty');
    });
    expect(result.current.empty).toEqual({
      title: 'No one is here right now',
      text: 'Search for a customer, or check in a visit for the first arrival.',
    });
  });

  it('says a failure with its reference and a retry, which reads again', async () => {
    let fail = true;
    const { result } = renderList(() => (fail ? refused(403, { type: 'forbidden' }) : ok(NOW)));

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });
    expect(result.current.failure).toMatchObject({
      title: 'We couldn’t load who is present',
      retryLabel: 'Try again',
    });
    expect(heard(result.current.failure.reference ?? null)).toBe('Reference: req-1');

    fail = false;
    act(() => {
      result.current.failure.retry();
    });
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
  });

  it('keeps the rows after a failed refresh, and says it shows the last list', async () => {
    let fail = false;
    const { result, client } = renderList(() =>
      fail ? refused(403, { type: 'forbidden' }) : ok(NOW),
    );
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    fail = true;
    await act(async () => {
      await client.refetchQueries();
    });

    await waitFor(() => {
      expect(result.current.refreshFailure).toBe('We couldn’t refresh; showing the last list.');
    });
    expect(result.current.state).toBe('ready');
    expect(result.current.rows).toHaveLength(3);
  });
});
