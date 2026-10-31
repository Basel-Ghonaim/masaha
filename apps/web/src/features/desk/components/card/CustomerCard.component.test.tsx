import type { CustomerRow } from '@masaha/shared/desk';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { customerRow, subscriptionState } from '../../../../test/deskCustomer';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { CustomerCard } from './CustomerCard';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

/** A subscription of three days a week, all three used this week. */
const WEEKLY = {
  ...customerRow().current,
  id: 9,
  name: '3 days a week',
  daysPerWeek: 3,
  progress: { daysUsed: 3, daysThisWeek: 3, minutesUsed: 0, minutesToday: 0 },
} as NonNullable<CustomerRow['current']>;

/** Its statement, as `GET …/subscriptions/9` answers it. */
const STATEMENT = {
  ...subscriptionState({ id: 9, name: '3 days a week', status: 'ENDING_SOON', daysPerWeek: 3 }),
  paidAgorot: 0,
  balanceAgorot: 0,
  customer: { id: 4, name: 'Sara Khalid', phone: null },
  checkIns: [],
  payments: [],
  renewal: { startsOn: '2026-10-22' },
  renewedById: null,
};

function renderCard(row: CustomerRow) {
  const requests = fakeTransport((request: Request) =>
    request.url === '/manage/spaces/7/subscriptions/9' ? ok(STATEMENT) : ok({}),
  );
  const subscribe = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <CustomerCard
          spaceId={7}
          row={row}
          after={{ done: vi.fn(), focus: createRef() }}
          receive={vi.fn()}
          menu={{ owner: false, fileLink: (id) => `/file/${String(id)}`, subscribe }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { requests, subscribe };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('CustomerCard', () => {
  it('shows its subscription’s progress and «Not here»; no «Renew» while it runs', () => {
    renderCard(customerRow({ current: { ...WEEKLY, status: 'ACTIVE' } }));

    expect(screen.getByText('This week 3 of 3')).toBeVisible();
    expect(screen.getByText('Not here')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Renew' })).toBeNull();
  });

  it('renews one ending soon: reads its statement, then opens the sheet to renew it', async () => {
    const user = userEvent.setup();
    const row = customerRow({ current: { ...WEEKLY, status: 'ENDING_SOON' } });
    const { requests, subscribe } = renderCard(row);

    const renew = screen.getByRole('button', { name: 'Renew' });
    await user.click(renew);

    await waitFor(() => {
      expect(subscribe).toHaveBeenCalledTimes(1);
    });
    expect(requests.map(({ url }) => url)).toEqual(['/manage/spaces/7/subscriptions/9']);
    expect(subscribe).toHaveBeenCalledWith(
      {
        mode: 'renew',
        customer: row,
        renews: expect.objectContaining({ id: 9, name: '3 days a week' }) as unknown,
      },
      renew,
    );
  });

  it('offers «Renew» on an expired one’s choice, and «New subscription» with none', async () => {
    const user = userEvent.setup();
    const expired = customerRow({ current: { ...WEEKLY, status: 'EXPIRED' } });
    const first = renderCard(expired);

    await user.click(screen.getByRole('button', { name: heard('Check in Sara Khalid') }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Renew' }));
    await waitFor(() => {
      expect(first.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'renew' }),
        expect.anything(),
      );
    });
    expect(within(dialog).queryByRole('button', { name: 'New subscription' })).toBeNull();
  });

  it('offers «New subscription» on the choice of one with none', async () => {
    const user = userEvent.setup();
    const none = customerRow({ current: null });
    const { subscribe } = renderCard(none);

    await user.click(screen.getByRole('button', { name: heard('Check in Sara Khalid') }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: 'Renew' })).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'New subscription' }));

    expect(subscribe).toHaveBeenCalledWith(
      { mode: 'subscribe', customer: none },
      expect.anything(),
    );
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
