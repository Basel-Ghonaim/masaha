import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { paymentRow, paymentsPage, paymentTotals } from '../../../../test/paymentRow';
import { startPreferences } from '../../../../test/startPreferences';
import type { LedgerPerson } from '../../types/LedgerPerson';
import { useLedger } from './useLedger';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (line: string | null | undefined) => line?.replace(/[⁦-⁩]/g, '');

const PEOPLE: LedgerPerson[] = [
  { id: 15, name: 'Laila', self: false, active: true },
  { id: 14, name: 'Ahmad', self: true, active: true },
  { id: 35, name: 'Rami', self: false, active: false },
];

const TOTALS = paymentTotals({
  count: 21,
  receivedAgorot: 52500,
  byMethod: { CASH: 42500, TRANSFER: 10000 },
  voided: { count: 2, amountAgorot: 4000 },
});

function renderLedger(answer: () => FakeAnswer | Promise<FakeAnswer>, path = '/p') {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { ...renderHook(() => useLedger(7, { people: PEOPLE }), { wrapper }), requests, client };
}

beforeEach(() => {
  startPreferences('en');
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
});

describe('useLedger', () => {
  it('says the server’s totals, its period first, never a sum of the rows; a voided one is never received', async () => {
    // One row on the page, voided, while the totals are of the whole filter.
    const voided = paymentRow({
      amountAgorot: 9999,
      voided: { at: '2026-10-21T09:00:00.000Z', by: { id: 14, name: 'Ahmad' }, reason: 'Twice' },
    });
    const { result } = renderLedger(
      () => paymentsPage([voided], TOTALS, { total: 23 }),
      '/p?voided=1',
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(heard(result.current.totals?.line)).toBe(
      'Today · Total ₪525 · Cash ₪425 · Transfer ₪100 · 21 payments',
    );
    expect(heard(result.current.totals?.voided)).toBe('Voided: 2 payments · ₪40');
    expect(result.current.count).toBe('23 payments');
    expect(result.current.rows[0]?.voided?.label).toBe('Voided');
  });

  it('names a range’s period first in the totals', async () => {
    const { result } = renderLedger(
      () => paymentsPage([paymentRow()], TOTALS),
      '/p?from=2026-10-01&to=2026-10-21',
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(heard(result.current.totals?.line)).toMatch(/^1\s?–\s?21 October 2026 · Total ₪525/);
  });

  it('is loading, then failed with its reference and a retry', async () => {
    let answer: FakeAnswer = refused(403, { type: 'forbidden' });
    const { result, requests } = renderLedger(() => answer);

    expect(result.current.state).toBe('loading');
    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });
    expect(result.current.failure.title).toBe('We couldn’t load the payments');
    expect(result.current.failure.reference).toMatch(/req-1/);

    answer = paymentsPage([paymentRow()], TOTALS);
    act(() => {
      result.current.failure.retry();
    });
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(requests.length).toBeGreaterThan(1);
  });

  it('is empty today with no filter, and no match with «Clear filters» under one', async () => {
    const today = renderLedger(() => paymentsPage([], paymentTotals()));
    await waitFor(() => {
      expect(today.result.current.state).toBe('emptyToday');
    });
    expect(today.result.current.empty).toEqual({
      title: 'No payments today',
      text: 'Every payment recorded at the front desk shows up here. Choose a period to see earlier ones.',
      clear: null,
    });
    expect(today.result.current.toolbar.clear).toBeNull();
    today.unmount();

    const filtered = renderLedger(() => paymentsPage([], paymentTotals()), '/p?method=TRANSFER');
    await waitFor(() => {
      expect(filtered.result.current.state).toBe('noMatch');
    });
    expect(filtered.result.current.empty.title).toBe('No payments match the filters');
    expect(filtered.result.current.empty.clear?.label).toBe('Clear filters');
    expect(filtered.result.current.toolbar.sheet.show).toBe('No results — change the filters');
  });

  it('keeps the rows over a failed refresh, and keeps them busy while the next page loads', async () => {
    let answer: () => FakeAnswer | Promise<FakeAnswer> = () =>
      paymentsPage([paymentRow()], TOTALS, { total: 30 });
    const { result, client } = renderLedger(() => answer());
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    answer = () => refused(403, { type: 'forbidden' });
    await act(async () => {
      await client.refetchQueries();
    });
    await waitFor(() => {
      expect(result.current.refreshFailure).toBe('We couldn’t refresh; showing the last list.');
    });
    expect(result.current.rows).toHaveLength(1);

    answer = () => new Promise<FakeAnswer>(() => undefined);
    act(() => {
      result.current.toolbar.method.choose('CASH');
    });
    await waitFor(() => {
      expect(result.current.busy).toBe(true);
    });
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.state).toBe('ready');
  });

  it('offers all, the owner «(you)» first, the reception accounts, a deactivated one marked; one chosen sends `recordedById`', async () => {
    const { result, requests } = renderLedger(() => paymentsPage([paymentRow()], TOTALS));
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    expect(result.current.toolbar.staff.options).toEqual([
      { value: 'all', label: 'All staff' },
      { value: '14', label: 'Ahmad (you)' },
      { value: '15', label: 'Laila' },
      { value: '35', label: 'Rami · deactivated' },
    ]);
    act(() => {
      result.current.toolbar.staff.choose('35');
    });
    await waitFor(() => {
      expect(requests.at(-1)?.params).toMatchObject({ recordedById: 35, voided: 'EXCLUDE' });
    });
    expect(requests[0]?.params).toEqual({ voided: 'EXCLUDE', page: 1, limit: 20 });
  });
});
