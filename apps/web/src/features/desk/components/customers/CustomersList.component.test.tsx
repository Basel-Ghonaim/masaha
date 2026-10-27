import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { customerRow, customersPage } from '../../../../test/deskCustomer';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { CustomersList } from './CustomersList';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

const SARA = customerRow({ id: 4, name: 'Sara Khalid', debtAgorot: 3160 });
const OMAR = customerRow({ id: 5, name: 'Omar', phone: null, current: null });

function renderList(path = '/c', owner = true) {
  fakeTransport(() => customersPage([SARA, OMAR]));
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <main>
          <CustomersList
            spaceId={7}
            owner={owner}
            fileLink={(id) => `/file/${String(id)}`}
            subscribe={() => undefined}
          />
        </main>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
  restoreTransport();
});

describe('CustomersList', () => {
  it('shows five columns from 768 px, the name a link to the file; its filters inline; axe-clean at 1440', async () => {
    stubScreenWidth(1440);
    const { container } = renderList('/c?kind=CUSTOM');

    const table = await screen.findByRole('table', { name: 'The space’s customers' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Name', 'Subscription', 'Status', 'Balance', 'Actions']);
    expect(await within(table).findByRole('link', { name: 'Sara Khalid' })).toHaveAttribute(
      'href',
      '/file/4',
    );
    expect(within(table).getByText(heard('Owes ₪31.60'))).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Subscription type' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Payment' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '1 filter applied' })).toBeNull();
    expect(screen.getByText('2 customers')).toHaveAttribute('aria-live', 'polite');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('names its status chips, «Archived» for the owner only', async () => {
    stubScreenWidth(1440);
    const owner = renderList();
    const chips = await screen.findByRole('radiogroup', { name: 'Filter by status' });
    expect(
      within(chips)
        .getAllByRole('radio')
        .map((chip) => chip.textContent),
    ).toEqual(['All', 'Not started', 'Active', 'Ending soon', 'Expired', 'Archived']);
    expect(within(chips).getByRole('radio', { name: 'All' })).toBeChecked();
    owner.unmount();

    renderList('/c', false);
    const reception = await screen.findByRole('radiogroup', { name: 'Filter by status' });
    expect(within(reception).queryByRole('radio', { name: 'Archived' })).toBeNull();
  });

  it('shows cards below 768 px, its filters in a sheet with their count; axe-clean at 390', async () => {
    stubScreenWidth(390);
    const user = userEvent.setup();
    const { container } = renderList('/c?kind=CUSTOM');

    expect(await screen.findByRole('link', { name: 'Sara Khalid' })).toBeVisible();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Subscription type' })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('button', { name: '1 filter applied' }));
    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    expect(within(sheet).getByRole('combobox', { name: 'Subscription type' })).toBeVisible();
    expect(within(sheet).getByRole('combobox', { name: 'Payment' })).toBeVisible();
    await user.click(within(sheet).getByRole('button', { name: 'Show 2 customers' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
