import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { paymentRow, paymentsPage, paymentTotals } from '../../../../test/paymentRow';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { MyPaymentsToday } from './MyPaymentsToday';

const TOTALS = paymentTotals({
  count: 2,
  receivedAgorot: 7500,
  byMethod: { CASH: 5000, TRANSFER: 2500 },
});

function renderMine() {
  fakeTransport(() =>
    paymentsPage([paymentRow(), paymentRow({ id: 32, method: 'TRANSFER' })], TOTALS),
  );
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <main>
          <h1>My payments today</h1>
          <MyPaymentsToday spaceId={7} />
        </main>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('MyPaymentsToday', () => {
  it('shows one card of three rows at 390, the transfer’s helper there too; axe-clean', async () => {
    stubScreenWidth(390);
    const { container } = renderMine();

    const figures = await screen.findByRole('region', { name: 'Handover figures' });
    const terms = within(figures).getAllByRole('term');
    expect(terms).toHaveLength(3);
    expect(terms[0]).toHaveTextContent('Cash to hand over');
    expect(within(figures).getByText('Received in the space’s account')).toBeVisible();
    expect(within(figures).getByText('2 payments')).toBeVisible();
    expect(screen.queryByRole('table')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows three stat cards and the table from 768 px; axe-clean', async () => {
    stubScreenWidth(768);
    const { container } = renderMine();

    const figures = await screen.findByRole('region', { name: 'Handover figures' });
    const table = screen.getByRole('table', { name: 'My payments today' });
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
    expect(figures.querySelectorAll('[data-slot="stat-card"]')).toHaveLength(3);
    expect(within(figures).getByText('Received in the space’s account')).toBeVisible();
    expect(await within(table).findAllByText('Every other day')).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
  });
});
