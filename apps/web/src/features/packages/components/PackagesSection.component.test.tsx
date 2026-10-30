import type { SpacePackage } from '@masaha/shared/packages';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import type { ShiftChoice } from '../types/ShiftChoice';
import { PackagesSection } from './PackagesSection';

const TEN_DAYS: SpacePackage = {
  id: 3,
  name: '10 days',
  validityDays: 30,
  totalDays: 10,
  daysPerWeek: null,
  hoursPerDay: null,
  totalHours: null,
  billing: 'FIXED',
  priceAgorot: 15000,
  audience: 'GENERAL',
  shiftId: null,
  isActive: true,
};
const EVENINGS: SpacePackage = { ...TEN_DAYS, id: 4, name: 'Evenings', isActive: false };

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) =>
  name.replace(/[\u2066-\u2069]/g, '') === expected;

/** The section of space 7 holding `packages`, offered `shifts`, at a page whose hours are at `/profile#hours`. */
function renderSection(shifts: ShiftChoice[] | null, packages = [TEN_DAYS, EVENINGS]) {
  fakeTransport(() => ok(packages));
  const router = createMemoryRouter(
    [
      {
        path: '/packages',
        element: <PackagesSection spaceId={7} shifts={shifts} hoursLink="/profile#hours" />,
      },
    ],
    { initialEntries: ['/packages'] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
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

describe('PackagesSection', () => {
  it('names each row’s switch and edit by its package', async () => {
    renderSection([]);

    expect(
      await screen.findByRole('switch', { name: heard('10 days: available at the desk') }),
    ).toBeChecked();
    expect(
      screen.getByRole('switch', { name: heard('Evenings: available at the desk') }),
    ).not.toBeChecked();
    expect(screen.getByRole('button', { name: heard('Edit 10 days') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: heard('Edit Evenings') })).toBeInTheDocument();
  });

  it('labels the sheet’s amount by its billing', async () => {
    const user = userEvent.setup();
    renderSection([{ id: 2, nameAr: 'صباحي', nameEn: 'Morning' }]);
    await user.click(await screen.findByRole('button', { name: 'New package' }));
    const sheet = await screen.findByRole('dialog', { name: 'New package' });

    expect(within(sheet).getByRole('textbox', { name: 'Total price (₪)' })).toBeInTheDocument();
    await user.click(within(sheet).getByRole('radio', { name: 'Per hour' }));
    expect(within(sheet).getByRole('textbox', { name: 'Price per hour (₪)' })).toBeInTheDocument();
    expect(within(sheet).getByRole('radio', { name: 'No shift' })).toBeChecked();
  });

  it('says in the sheet when no shift is saved, and leads to the opening hours, with no axe violations', async () => {
    const user = userEvent.setup();
    renderSection([]);
    await user.click(await screen.findByRole('button', { name: 'New package' }));
    const sheet = await screen.findByRole('dialog', { name: 'New package' });

    expect(within(sheet).getByText(/No shifts are saved yet\./)).toBeInTheDocument();
    expect(
      within(sheet).getByRole('link', { name: 'Add shifts in the opening hours' }),
    ).toHaveAttribute('href', '/profile#hours');
    expect(await axe(document.body)).toHaveNoViolations();
  });
  it('says the desk sells the packages, and puts a row’s price at its end beside its switch', async () => {
    renderSection([]);

    expect(
      await screen.findByText(
        'Never shown to visitors · chosen at the desk when creating a subscription',
      ),
    ).toBeInTheDocument();
    const toggle = await screen.findByRole('switch', {
      name: heard('10 days: available at the desk'),
    });
    expect(screen.getAllByText('Available at the desk')).toHaveLength(2);
    const end = toggle.closest('li')?.lastElementChild as HTMLElement;
    expect(within(end).getByText('₪150')).toHaveClass('text-label');
  });

  it('says the sheet’s package is the desk’s', async () => {
    const user = userEvent.setup();
    renderSection([]);
    await user.click(await screen.findByRole('button', { name: 'New package' }));
    const sheet = await screen.findByRole('dialog', { name: 'New package' });

    expect(
      within(sheet).getByText('Private — never shown to visitors; chosen at the front desk.'),
    ).toBeInTheDocument();
  });

  it('offers to create a package to pick at the desk when there is none', async () => {
    renderSection([], []);

    expect(await screen.findByText('No private packages')).toBeInTheDocument();
    expect(
      screen.getByText('Create a package like «10 days» or «20 hours» to pick at the desk.'),
    ).toBeInTheDocument();
  });
});
