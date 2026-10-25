import type { CustomerFile } from '@masaha/shared/desk';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { subscriptionState } from '../../../../test/deskCustomer';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { PayDialog } from './PayDialog';

const FILE: CustomerFile = {
  customer: { id: 5, name: 'Rami Salem', phone: null, archivedAt: null },
  debtAgorot: 5000,
  creditAgorot: 0,
  present: null,
  subscriptions: [
    {
      ...subscriptionState({ id: 2, customerId: 5, name: 'Two weeks' }),
      paidAgorot: 10000,
      balanceAgorot: 5000,
    },
  ],
  unpaidVisits: [],
};

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('PayDialog', () => {
  it('names its items’ group and its money group; «Received now» focused first; axe-clean', async () => {
    fakeTransport(() => ok(FILE));
    render(
      <QueryClientProvider client={createQueryClient()}>
        <PayDialog
          spaceId={7}
          target={{ customerId: 5 }}
          presentIds={new Set()}
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    );

    const amount = await screen.findByRole('textbox', { name: 'Received now (₪)' });
    expect(amount).toHaveFocus();
    expect(screen.getByRole('radiogroup', { name: 'The payment is for' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Payment' })).toBeVisible();
    expect(await axe(screen.getByRole('dialog'))).toHaveNoViolations();
  });
});
