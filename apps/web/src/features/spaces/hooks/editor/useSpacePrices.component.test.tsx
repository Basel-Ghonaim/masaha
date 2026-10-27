import type { Price } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { useSpacePrices } from './useSpacePrices';

const month = (amountAgorot: number): Price => ({
  period: 'MONTH',
  audience: 'GENERAL',
  shiftId: null,
  labelAr: null,
  labelEn: null,
  amountAgorot,
});

afterEach(() => {
  restoreTransport();
});

describe('useSpacePrices', () => {
  it('reads the prices again each time a screen opens, never showing the older read meanwhile', async () => {
    let amount = 30000;
    const requests = fakeTransport(() => ok({ prices: [month(amount)] }));
    const client = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const first = renderHook(() => useSpacePrices('owner', 7), { wrapper });
    await waitFor(() => {
      expect(first.result.current.state).toBe('ready');
    });
    expect(first.result.current.prices.map(({ amountAgorot }) => amountAgorot)).toEqual([30000]);
    first.unmount();

    amount = 32000;
    const again = renderHook(() => useSpacePrices('owner', 7), { wrapper });
    expect(again.result.current.state).toBe('loading');
    expect(again.result.current.prices).toEqual([]);
    await waitFor(() => {
      expect(again.result.current.state).toBe('ready');
    });
    expect(again.result.current.prices.map(({ amountAgorot }) => amountAgorot)).toEqual([32000]);
    expect(requests.map(({ url }) => url)).toEqual(['/manage/spaces/7', '/manage/spaces/7']);
  });

  it('keeps the prices shown while the space is read again behind them, and hides them for a refresh', async () => {
    // Each read after the first waits until the test lets it answer.
    let release: () => void = () => undefined;
    const requests = fakeTransport((_request, index) =>
      index === 0
        ? ok({ prices: [month(30000)] })
        : new Promise((resolve) => {
            release = () => {
              resolve(ok({ prices: [month(30000)] }));
            };
          }),
    );
    const client = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSpacePrices('owner', 7), { wrapper });
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    // As a return to the window does: the space read again, behind the sheet.
    act(() => {
      void client.invalidateQueries({ queryKey: ['space', 7] });
    });
    await waitFor(() => {
      expect(requests).toHaveLength(2);
    });
    expect(result.current.state).toBe('ready');
    expect(result.current.prices).toHaveLength(1);
    act(() => {
      release();
    });
    await waitFor(() => {
      expect(client.isFetching()).toBe(0);
    });

    // A refresh after a refusal hides them until it answers.
    act(() => {
      result.current.refresh();
    });
    await waitFor(() => {
      expect(requests).toHaveLength(3);
    });
    expect(result.current.state).toBe('loading');
    act(() => {
      release();
    });
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
  });
});
