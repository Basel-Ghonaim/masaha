import type { PaymentRow } from '@masaha/shared/payments';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { paymentRow, paymentsPage, paymentTotals } from '../../../../test/paymentRow';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import type { LedgerPerson } from '../../types/LedgerPerson';
import { PaymentsLedger, type LedgerRowAction } from './PaymentsLedger';

const PEOPLE: LedgerPerson[] = [{ id: 14, name: 'Ahmad', self: true, active: true }];
const TOTALS = paymentTotals({
  count: 2,
  receivedAgorot: 5000,
  byMethod: { CASH: 5000, TRANSFER: 0 },
});

/** The page's action: a button that names its payment, as the void's «⋯» does. */
const rowAction: LedgerRowAction = (payment) => (
  <button type="button" data-row-action="">
    {`Act on ${String(payment.id)}`}
  </button>
);

/** The address the ledger writes, shown so a test can read it. */
function Address() {
  return <output aria-label="Address">{useLocation().search}</output>;
}

function renderLedger(rows: () => PaymentRow[], path = '/p') {
  fakeTransport(() => paymentsPage(rows(), TOTALS));
  const client = createQueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <main>
          <h1>Payments</h1>
          <PaymentsLedger
            spaceId={7}
            people={PEOPLE}
            customerLink={(id) => `/customers/${String(id)}`}
            rowAction={rowAction}
          />
        </main>
        <Address />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, client };
}

const TWO = [
  paymentRow({ id: 31 }),
  paymentRow({ id: 32, customer: null, item: { kind: 'VISIT', id: 9, visitorName: 'Omar' } }),
];

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('PaymentsLedger', () => {
  it('draws five columns and the filters in a row from 768 px; axe-clean at 1440', async () => {
    stubScreenWidth(1440);
    const { container } = renderLedger(() => TWO);

    const table = await screen.findByRole('table', { name: 'Payments ledger' });
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
    expect(await within(table).findByRole('link', { name: 'Sara Khalid' })).toHaveAttribute(
      'href',
      '/customers/4',
    );
    expect(within(table).getByText('Omar')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Staff' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Filters' })).toBeNull();
    expect(screen.getByRole('button', { name: /^Period/ })).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('draws a card each and the filters in a sheet with its count at 390, the range counted; axe-clean', async () => {
    stubScreenWidth(390);
    const user = userEvent.setup();
    const { container } = renderLedger(() => TWO, '/p?from=2026-10-01&to=2026-10-21&kind=VISIT');

    expect(await screen.findByRole('link', { name: 'Sara Khalid' })).toBeVisible();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Staff' })).toBeNull();
    const button = screen.getByRole('button', { name: '2 filters applied' });
    expect(await axe(container)).toHaveNoViolations();

    await user.click(button);
    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    expect(within(sheet).getByRole('combobox', { name: 'Staff' })).toBeVisible();
    expect(within(sheet).getByRole('button', { name: 'Show 2 payments' })).toBeVisible();
    expect(within(sheet).getByRole('button', { name: 'Clear filters' })).toBeVisible();
  });

  it('gives the focus to the next row’s action when the focused row leaves, else to the totals line', async () => {
    stubScreenWidth(1440);
    let rows = TWO;
    const { client } = renderLedger(() => rows);

    const first = await screen.findByRole('button', { name: 'Act on 31' });
    act(() => {
      first.focus();
    });
    rows = [TWO[1] as PaymentRow];
    await act(async () => {
      await client.invalidateQueries();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Act on 32' })).toHaveFocus();
    });

    rows = [];
    await act(async () => {
      await client.invalidateQueries();
    });
    await waitFor(() => {
      expect(screen.getByText(/^Today · Total/).closest('p')).toHaveFocus();
    });
  });

  it('applies a period once its second day is chosen, the earlier first; a new click starts afresh', async () => {
    stubScreenWidth(1440);
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-21T12:00:00.000Z'));
    const user = userEvent.setup();
    renderLedger(() => TWO);
    const address = () => screen.getByRole('status', { name: 'Address' });
    const picker = () => screen.queryByRole('dialog', { name: 'Choose a period' });

    await user.click(await screen.findByRole('button', { name: /^Period/ }));
    await user.click(await screen.findByRole('button', { name: /October 10th, 2026/ }));
    // One day chosen: the picker stays open on it, and nothing is applied yet.
    expect(picker()).toBeVisible();
    expect(address()).toHaveTextContent(/^$/);

    await user.click(screen.getByRole('button', { name: /October 5th, 2026/ }));
    await waitFor(() => {
      expect(address()).toHaveTextContent('?from=2026-10-05&to=2026-10-10');
    });
    expect(picker()).toBeNull();

    // Reopened on the applied range, a click starts a new one: nothing is applied.
    await user.click(screen.getByRole('button', { name: /^Period/ }));
    await user.click(await screen.findByRole('button', { name: /October 20th, 2026/ }));
    expect(picker()).toBeVisible();
    expect(address()).toHaveTextContent('?from=2026-10-05&to=2026-10-10');
    vi.useRealTimers();
  });
});
