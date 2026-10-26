import type { SubscriptionStatement } from '@masaha/shared/desk';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { customerFile, subscriptionState } from '../../../../test/deskCustomer';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { CustomerFile } from '../file/CustomerFile';

const SUBSCRIPTION = {
  ...subscriptionState({ id: 3, name: 'Every other day' }),
  paidAgorot: 10000,
  balanceAgorot: 0,
};

const STATEMENT: SubscriptionStatement = {
  ...SUBSCRIPTION,
  customer: { id: 4, name: 'Sara Khalid', phone: null },
  checkIns: [
    {
      id: 1,
      checkedInAt: '2026-10-20T06:00:00Z',
      checkedOutAt: '2026-10-20T08:30:00Z',
      checkoutMethod: 'AUTO',
      minutes: 150,
    },
  ],
  payments: [
    {
      id: 8,
      amountAgorot: 10000,
      method: 'CASH',
      note: null,
      receivedAt: '2026-10-02T09:00:00Z',
      recordedById: 14,
      voided: { at: '2026-10-03T09:00:00Z', byId: 14, reason: 'Entered twice' },
    },
  ],
  renewal: null,
  renewedById: null,
};

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
  restoreTransport();
});

describe('Statement', () => {
  it.each([390, 1440])(
    'opens in its card, controlled by «Show the statement», a voided payment struck; axe-clean at %i',
    async (width) => {
      stubScreenWidth(width);
      const user = userEvent.setup();
      fakeTransport((request) =>
        request.url === '/manage/spaces/7/subscriptions/3'
          ? ok(STATEMENT)
          : ok(customerFile({ subscriptions: [SUBSCRIPTION] })),
      );
      const { container } = render(
        <QueryClientProvider client={createQueryClient()}>
          <main>
            <h1>Sara Khalid</h1>
            <CustomerFile spaceId={7} customerId={4} owner subscribe={() => undefined} />
          </main>
        </QueryClientProvider>,
      );

      const toggle = await screen.findByRole('button', { name: 'Show the statement' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(toggle).toHaveAccessibleName('Hide the statement');
      const statement = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
      expect(statement).not.toBeNull();
      const payments = await within(statement as HTMLElement).findByRole('heading', {
        level: 4,
        name: 'Payments',
      });
      expect(payments).toBeVisible();
      expect(within(statement as HTMLElement).getByText('Voided')).toBeVisible();
      expect(within(statement as HTMLElement).getByText('Voided: Entered twice')).toBeVisible();
      expect(within(statement as HTMLElement).getByText('Auto check-out')).toBeVisible();
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
