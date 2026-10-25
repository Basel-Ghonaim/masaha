import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { customerFile, subscriptionState } from '../../../../test/deskCustomer';
import { deskVisit } from '../../../../test/deskVisit';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { CustomerFile } from './CustomerFile';

const FILE = customerFile({
  debtAgorot: 6500,
  subscriptions: [
    {
      ...subscriptionState({ id: 2, name: 'Two weeks', priceTyped: { byId: 14, reason: 'Deal' } }),
      paidAgorot: 10000,
      balanceAgorot: 5000,
    },
    {
      ...subscriptionState({ id: 1, name: 'Exams', status: 'EXPIRED' }),
      paidAgorot: 15000,
      balanceAgorot: 0,
    },
  ],
  unpaidVisits: [
    {
      visit: deskVisit({
        id: 3,
        checkedOutAt: '2026-10-24T15:00:00Z',
        checkoutMethod: 'MANUAL',
        charge: {
          amountAgorot: 2500,
          roundingRule: null,
          roundingMinutes: null,
          capApplied: null,
          typedById: null,
          reason: null,
        },
      }),
      payments: [],
      paidAgorot: 1000,
      balanceAgorot: 1500,
    },
  ],
});

beforeEach(() => {
  startPreferences('en');
  stubScreenWidth(1440);
});

afterEach(() => {
  restoreTransport();
});

describe('CustomerFile', () => {
  it('heads its sections h2 and its cards h3, under the page’s h1; axe-clean', async () => {
    fakeTransport(() => ok(FILE));
    const { container } = render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <main>
            <h1>Sara Khalid</h1>
            <CustomerFile spaceId={7} customerId={4} />
          </main>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const subscriptions = await screen.findByRole('heading', { level: 2, name: 'Subscriptions' });
    expect(screen.getByRole('heading', { level: 2, name: 'Unpaid visits' })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(['Two weeks', 'Exams']);
    const region = screen.getByRole('region', { name: 'Subscriptions' });
    expect(region).toContainElement(subscriptions);
    expect(within(region).getByText('Typed price')).toBeVisible();
    expect(within(region).getAllByRole('button', { name: 'Receive what’s left' })).toHaveLength(1);
    expect(await axe(container)).toHaveNoViolations();
  });
});
