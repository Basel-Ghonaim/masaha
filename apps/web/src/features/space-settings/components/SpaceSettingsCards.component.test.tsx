import type { SpaceSettings } from '@masaha/shared/space-settings';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { SpaceSettingsCards } from './SpaceSettingsCards';

const SETTINGS: SpaceSettings = {
  autoCheckoutAtClosing: true,
  maxStayMinutes: null,
  visitRounding: 'UP_AFTER_MINUTES',
  visitRoundingMinutes: 10,
  visitCapAtDayPrice: true,
  visitStudentPrices: false,
  receptionMayTypePrices: false,
  reminderTemplate: null,
};

/** The settings cards of space 7, the server answering their read with `answer`. */
function renderCards(answer: () => FakeAnswer) {
  fakeTransport(answer);
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <main>
            <SpaceSettingsCards spaceId={7} pricesLink="/packages" spaceName="Focus Hub" />
          </main>
        ),
      },
    ],
    { initialEntries: ['/'] },
  );
  const client = createQueryClient();
  // The owner's own spaces, as `space-links` keeps them, so a refresh of the user's scope is seen.
  client.setQueryData(['me', 'spaces'], []);
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), client };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('SpaceSettingsCards', () => {
  it('titles each card, marks one changed as unsaved with its discard, and has no axe violations', async () => {
    const { user } = renderCards(() => ok(SETTINGS));

    const reception = (await screen.findByRole('heading', { level: 2, name: 'Reception' })).closest(
      '[id="reception"]',
    );
    if (!(reception instanceof HTMLElement)) throw new Error('no card');
    expect(screen.getByRole('heading', { level: 2, name: 'Visit pricing' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Packages & prices' })).toHaveAttribute(
      'href',
      '/packages',
    );
    expect(within(reception).queryByText('Unsaved changes')).toBeNull();

    await user.click(
      within(reception).getByRole('switch', { name: 'Reception may type a price by hand' }),
    );

    expect(within(reception).getByText('Unsaved changes')).toBeInTheDocument();
    await user.click(within(reception).getByRole('button', { name: 'Discard changes' }));
    expect(within(reception).queryByText('Unsaved changes')).toBeNull();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('says it is loading to a screen reader while the settings arrive', () => {
    renderCards(() => ok(SETTINGS));

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('says the settings could not be read, with «Try again»', async () => {
    const { client } = renderCards(() => refused(404, { type: 'not_found' }));

    expect(await screen.findByText('We couldn’t load the settings')).toBeInTheDocument();
    // A 404 is a link ended meanwhile: the owner's own spaces are fetched again.
    expect(client.getQueryState(['me', 'spaces'])?.isInvalidated).toBe(true);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
