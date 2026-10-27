import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { paymentRow, paymentsPage, paymentTotals } from '../../../../test/paymentRow';
import { startPreferences } from '../../../../test/startPreferences';
import { useMyPaymentsToday } from './useMyPaymentsToday';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (line: string | null | undefined) => line?.replace(/[⁦-⁩]/g, '');

const TOTALS = paymentTotals({
  count: 3,
  receivedAgorot: 7500,
  byMethod: { CASH: 5000, TRANSFER: 2500 },
  voided: { count: 1, amountAgorot: 1000 },
});

function renderMine(answer: () => FakeAnswer | Promise<FakeAnswer>, path = '/m') {
  const requests = fakeTransport(answer);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { ...renderHook(() => useMyPaymentsToday(7), { wrapper }), requests };
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

describe('useMyPaymentsToday', () => {
  it('says the server’s figures, the cash first, never summed; sends no range nor `recordedById`', async () => {
    // One row of ₪1 on the page, while the totals are of the whole day.
    const { result, requests } = renderMine(
      () => paymentsPage([paymentRow({ amountAgorot: 100 })], TOTALS),
      '/m?page=2',
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    const figures = result.current.figures;
    expect([figures?.cash.label, heard(figures?.cash.amount)]).toEqual([
      'Cash to hand over',
      '₪50',
    ]);
    expect([heard(figures?.transfer.amount), figures?.transfer.helper]).toEqual([
      '₪25',
      'Received in the space’s account',
    ]);
    expect([heard(figures?.total.amount), figures?.total.count]).toEqual(['₪75', '3 payments']);
    expect(heard(result.current.intro)).toBe(
      'The payments you recorded today, for the end-of-shift handover · 21 October',
    );
    expect(requests.map(({ url }) => url)).toEqual(['/manage/spaces/7/payments']);
    expect(requests[0]?.params).toEqual({ voided: 'INCLUDE', page: 2, limit: 20 });
  });

  it('is loading, then failed with a retry; empty with its line', async () => {
    const failed = renderMine(() => refused(403, { type: 'forbidden' }));
    expect(failed.result.current.state).toBe('loading');
    await waitFor(() => {
      expect(failed.result.current.state).toBe('failed');
    });
    expect(failed.result.current.failure.title).toBe('We couldn’t load your payments');
    failed.unmount();

    const empty = renderMine(() => paymentsPage([], paymentTotals()));
    await waitFor(() => {
      expect(empty.result.current.state).toBe('empty');
    });
    expect(empty.result.current.empty).toBe('You haven’t recorded any payments today');
    expect(heard(empty.result.current.figures?.cash.amount)).toBe('₪0');
  });

  it('strikes a voided one with who voided it and why, and counts it in no figure', async () => {
    const voided = paymentRow({
      amountAgorot: 100,
      voided: { at: '2026-10-21T10:00:00.000Z', by: { id: 14, name: 'Ahmad' }, reason: 'Test' },
    });
    const { result } = renderMine(() =>
      paymentsPage([voided], paymentTotals({ voided: { count: 1, amountAgorot: 100 } })),
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(result.current.rows[0]?.voided?.label).toBe('Voided');
    expect(heard(result.current.rows[0]?.voided?.line)).toBe('Voided by Ahmad: Test');
    expect(heard(result.current.figures?.total.amount)).toBe('₪0');
    expect(result.current.figures?.total.count).toBe('0 payments');
  });
});
