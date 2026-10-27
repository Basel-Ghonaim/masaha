import type { SpacePackage } from '@masaha/shared/packages';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { customerFile, customerRow } from '../../../../test/deskCustomer';
import { visitTerms } from '../../../../test/deskVisit';
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

function renderSheet(entry: SheetEntry) {
  fakeTransport((request) =>
    request.url?.endsWith('/visit-terms') === true
      ? ok(visitTerms({ mayTypePrice: true }))
      : ok(customerFile()),
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
          prices: { state: 'ready', list: [], refresh: vi.fn() },
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

  it.each([390, 1440])('has no accessibility violations at %i px', async (width) => {
    stubScreenWidth(width);
    const sheet = renderSheet({ mode: 'subscribe', customer: customerRow() });
    await within(sheet).findByRole('radio', { name: /Custom/ });
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
