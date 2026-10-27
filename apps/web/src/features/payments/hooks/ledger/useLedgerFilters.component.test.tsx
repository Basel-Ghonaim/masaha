import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { startPreferences } from '../../../../test/startPreferences';
import { useLedgerFilters } from './useLedgerFilters';

/** The filters, on a page at `path` entered from another page, with the address and a way back. */
function renderFilters(path: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/before', path]} initialIndex={1}>
      {children}
    </MemoryRouter>
  );
  return renderHook(
    () => ({ filters: useLedgerFilters(), location: useLocation(), navigate: useNavigate() }),
    { wrapper },
  );
}

beforeEach(() => {
  startPreferences('en');
});

describe('useLedgerFilters', () => {
  it('replaces the address with each filter chosen, back on the first page', () => {
    const { result } = renderFilters('/p?page=3');

    act(() => {
      result.current.filters.choose.range('2026-10-01', '2026-10-21');
    });
    expect(result.current.location.search).toBe('?from=2026-10-01&to=2026-10-21');
    act(() => {
      result.current.filters.choose.staff(15);
      result.current.filters.choose.method('CASH');
      result.current.filters.choose.kind('VISIT');
      result.current.filters.choose.voided(true);
    });
    expect(result.current.location.search).toBe(
      '?from=2026-10-01&to=2026-10-21&staff=15&method=CASH&kind=VISIT&voided=1',
    );
    // The range counted, as the sheet's button says it (DI-2); the chip is not the sheet's.
    expect(result.current.filters.applied).toBe(4);
    expect(result.current.filters.anyApplied).toBe(true);

    // Replaced, not pushed: Back leaves the list.
    act(() => {
      void result.current.navigate(-1);
    });
    expect(result.current.location.pathname).toBe('/before');
  });

  it('says a range over 92 days and does not write it; 92 is written', () => {
    const { result } = renderFilters('/p?staff=15');

    act(() => {
      result.current.filters.choose.range('2026-07-22', '2026-10-22');
    });
    expect(result.current.filters.rangeError).toBe(
      'The longest period is 92 days; choose a shorter one.',
    );
    expect(result.current.location.search).toBe('?staff=15');

    act(() => {
      result.current.filters.choose.range('2026-07-23', '2026-10-22');
    });
    expect(result.current.filters.rangeError).toBeNull();
    expect(result.current.location.search).toBe('?from=2026-07-23&to=2026-10-22&staff=15');
  });

  it('clears the range, the staff member, the method, the kind and «Show voided» together', () => {
    const { result } = renderFilters(
      '/p?from=2026-10-01&to=2026-10-21&staff=15&method=CASH&kind=VISIT&voided=1&page=2',
    );
    expect(result.current.filters.applied).toBe(4);

    act(() => {
      result.current.filters.clear();
    });
    expect(result.current.location.search).toBe('');
    expect(result.current.filters.applied).toBe(0);
    expect(result.current.filters.anyApplied).toBe(false);
  });

  it('takes the range off for today', () => {
    const { result } = renderFilters('/p?from=2026-10-01&to=2026-10-21&method=CASH');

    act(() => {
      result.current.filters.choose.range();
    });
    expect(result.current.location.search).toBe('?method=CASH');
  });
});
