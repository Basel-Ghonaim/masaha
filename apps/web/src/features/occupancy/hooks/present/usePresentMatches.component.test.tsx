import type { SpaceOccupancyNow } from '@masaha/shared/occupancy';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { usePresentMatches } from './usePresentMatches';

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
      name: 'Samir',
      since: '2026-07-01T09:00:00.000Z',
      chargeNowAgorot: null,
    },
  ],
};
const PHONES = new Map([[4, '+970599000201']]);

function renderMatches(term: string) {
  const client = createQueryClient();
  const requests = fakeTransport(() => ok(NOW));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(({ text }) => usePresentMatches(7, text, PHONES), {
    wrapper,
    initialProps: { text: term },
  });
  return { ...hook, requests };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('usePresentMatches', () => {
  it('lists the people present who match, in the server’s order, as the first group', async () => {
    const { result, requests } = renderMatches('Sa');

    await waitFor(() => {
      expect(result.current.rows.map((row) => row.name)).toEqual(['Sara', 'Samir']);
    });
    expect(result.current.heading).toBe('Here now');
    expect(result.current.rows[0]?.kind).toBe('Subscription');
    expect(requests[0]?.url).toBe('/manage/spaces/7/occupancy');
  });

  it('matches a subscriber by their phone’s last digits', async () => {
    const { result } = renderMatches('201');

    await waitFor(() => {
      expect(result.current.rows.map((row) => row.name)).toEqual(['Sara']);
    });
  });

  it('lists no one for an empty term', async () => {
    const { result, rerender } = renderMatches('Sa');
    await waitFor(() => {
      expect(result.current.rows).toHaveLength(2);
    });

    rerender({ text: '' });
    expect(result.current.rows).toEqual([]);
  });
});
