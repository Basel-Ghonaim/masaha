import type { CustomerFile } from '@masaha/shared/desk';
import type { SpacePackage } from '@masaha/shared/packages';
import type { Price } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { customerFile, customerRow } from '../../../../test/deskCustomer';
import { deskVisit, visitTerms } from '../../../../test/deskVisit';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import type { SheetEntry } from '../../types/SheetEntry';
import { SubscriptionSheet } from './SubscriptionSheet';

/** A package with no limits: its terms say so plainly. */
const OPEN_MONTH: SpacePackage = {
  id: 3,
  name: 'Open month',
  validityDays: 30,
  totalDays: null,
  daysPerWeek: null,
  hoursPerDay: null,
  totalHours: null,
  billing: 'FIXED',
  priceAgorot: 30000,
  audience: 'GENERAL',
  shiftId: null,
  isActive: true,
};

function renderSheet(
  entry: SheetEntry,
  { file = customerFile(), prices = [] }: { file?: CustomerFile; prices?: Price[] } = {},
) {
  fakeTransport((request) =>
    request.url?.endsWith('/visit-terms') === true
      ? ok(visitTerms({ mayTypePrice: true }))
      : ok(file),
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <SubscriptionSheet
        spaceId={7}
        entry={entry}
        choices={{
          state: 'ready',
          packages: [OPEN_MONTH],
          retry: vi.fn(),
          prices: { state: 'ready', list: prices, refresh: vi.fn() },
          shifts: [],
        }}
        returnFocus={() => null}
        onClose={vi.fn()}
      />
    </QueryClientProvider>,
  );
  return screen.getByRole('dialog');
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('SubscriptionSheet', () => {
  it('is titled by its mode, its first field focused', async () => {
    const sheet = renderSheet({ mode: 'new', name: 'Sara Khalid' });
    expect(within(sheet).getByRole('heading', { name: 'New customer' })).toBeVisible();
    await waitFor(() => {
      expect(within(sheet).getByRole('textbox', { name: 'Name' })).toHaveFocus();
    });
  });

  it('names a known customer’s new subscription, the package’s terms a plain line', async () => {
    const sheet = renderSheet({ mode: 'subscribe', customer: customerRow() });
    expect(within(sheet).getByRole('heading', { name: 'New subscription' })).toBeVisible();
    const option = (await within(sheet).findByRole('radio', { name: /Open month/ })).closest(
      'label',
    );
    expect(option).toHaveTextContent('30 days · No extra terms');
    // DI-45: no limit is no warning.
    expect(option?.querySelector('svg')).toBeNull();
  });

  it('asks its dates with the layer’s date pickers, says a package’s end, and marks the desk’s packages private', async () => {
    const user = userEvent.setup();
    const sheet = renderSheet({ mode: 'subscribe', customer: customerRow() });
    const option = (await within(sheet).findByRole('radio', { name: /Open month/ })).closest(
      'label',
    );
    expect(option).toHaveTextContent('Private');
    expect(within(sheet).getByText('For the desk only — never shown to visitors')).toBeVisible();
    expect(sheet.querySelector('input[type="date"]')).toBeNull();
    expect(within(sheet).getByRole('button', { name: /^From / })).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    );
    // A package's end is said from its validity, not a field.
    expect(within(sheet).queryByRole('textbox', { name: /^To/ })).toBeNull();
    expect(within(sheet).getByText('From the package')).toBeVisible();

    await user.click(await within(sheet).findByRole('radio', { name: /Custom/ }));
    expect(await within(sheet).findByRole('button', { name: 'To No end date' })).toBeVisible();
    expect(
      within(sheet).getByText('No end date · it stays active until it is ended'),
    ).toBeVisible();
    await user.type(within(sheet).getByRole('textbox', { name: 'Total days' }), '12');
    expect(within(sheet).getByText('No end date · ends once 12 days are used')).toBeVisible();
  });

  it('warns of an earlier debt, lists it and the new one in the block, its due «Total»', async () => {
    const owing = customerFile({
      debtAgorot: 2000,
      unpaidVisits: [
        {
          visit: deskVisit({
            id: 9,
            checkedOutAt: '2026-07-01T09:00:00.000Z',
            checkoutMethod: 'AUTO',
          }),
          payments: [],
          paidAgorot: 0,
          balanceAgorot: 2000,
        },
      ],
    });
    const sheet = renderSheet(
      { mode: 'subscribe', customer: customerRow({ debtAgorot: 2000 }) },
      { file: owing },
    );
    await within(sheet).findByRole('radio', { name: /Open month/ });
    const plain = (text: string | null) => (text ?? '').replace(/[⁦-⁩]/g, '');
    const warning = await within(sheet).findByText((_, element) =>
      element?.getAttribute('data-slot') === 'alert-title'
        ? plain(element.textContent) === 'Owed from before: ₪20'
        : false,
    );
    expect(warning.closest('[data-slot="alert"]')).toHaveAttribute('data-variant', 'warning');
    const money = within(sheet).getByRole('group', { name: 'Payment' });
    const lines = within(money)
      .getAllByRole('listitem')
      .map((item) => plain(item.textContent));
    expect(lines.at(-1)).toBe('Subscription: Open month ₪300');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/: ₪20$/);
    expect(within(money).getByText('Total')).toBeVisible();
  });

  it('prefills a usage-based custom rate from the published price, and says how it is charged', async () => {
    const user = userEvent.setup();
    const hour: Price = {
      period: 'HOUR',
      audience: 'GENERAL',
      shiftId: null,
      labelAr: null,
      labelEn: null,
      amountAgorot: 500,
    };
    const sheet = renderSheet({ mode: 'subscribe', customer: customerRow() }, { prices: [hour] });
    await user.click(await within(sheet).findByRole('radio', { name: /Custom/ }));
    await user.click(within(sheet).getByRole('radio', { name: 'Per hour' }));
    const rate = within(sheet).getByRole('textbox', { name: 'Rate (₪)' });
    expect(rate).toHaveValue('5');
    expect(rate).toHaveAccessibleDescription('From the published price');
    expect(
      within(sheet).getByText(
        (content) => content.replace(/[⁦-⁩]/g, '') === 'Charged by attendance: ₪5 an hour',
      ),
    ).toBeVisible();
  });

  it.each([390, 1440])('has no accessibility violations at %i px', async (width) => {
    stubScreenWidth(width);
    const sheet = renderSheet({ mode: 'subscribe', customer: customerRow() });
    await within(sheet).findByRole('radio', { name: /Custom/ });
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
