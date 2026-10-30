import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { SettingsPage } from './SettingsPage';

const SETTINGS = {
  autoCheckoutAtClosing: true,
  maxStayMinutes: null,
  visitRounding: 'PER_MINUTE',
  visitRoundingMinutes: null,
  visitCapAtDayPrice: true,
  visitStudentPrices: false,
  receptionMayTypePrices: false,
  reminderTemplate: null,
};

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe("the owner's settings page", () => {
  it('ends with «My account», linking the personal settings; the helpers say where things go', async () => {
    startPreferences('en');
    fakeTransport((request) => {
      if (request.url === '/manage/spaces') return ok([]);
      if (request.url === '/manage/spaces/7/capacity') return ok({ capacity: 40 });
      return ok(SETTINGS);
    });
    const router = createMemoryRouter(
      [{ path: '/dashboard/spaces/:spaceId/settings', element: <SettingsPage /> }],
      { initialEntries: ['/dashboard/spaces/7/settings'] },
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    const headings = await screen.findAllByRole('heading', { level: 2 });
    const account = headings.at(-1)?.closest('[data-slot="card"]') as HTMLElement;
    expect(within(account).getByRole('heading', { name: 'My account' })).toBeInTheDocument();
    expect(within(account).getByRole('link', { name: 'Personal settings' })).toHaveAttribute(
      'href',
      '/me',
    );
    expect(
      await screen.findByText(
        'Whoever is still in is checked out at closing. Unpaid visits show under «Uncollected».',
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'A ready WhatsApp message reminding a customer of their debt; it opens from the customer’s file and from Finance, and you send it.',
      ),
    ).toBeInTheDocument();
  });
});
