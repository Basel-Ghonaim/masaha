import type { DirectorySpace, FavoriteSpace } from '@masaha/shared/directory';
import { createQueryClient } from '@shared/api';
import { establishSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { aSession } from '../../../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { FavoritesView } from './FavoritesView';

const LISTED: DirectorySpace = {
  id: 7,
  slug: 'masaha-hub',
  nameEn: 'Masaha Hub',
  nameAr: null,
  area: { id: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: true,
  days: null,
  cover: null,
  liveStatus: 'AVAILABLE',
};

const gone = (id: number, nameEn: string): FavoriteSpace => ({
  listed: false,
  savedAt: '2026-10-26T09:00:00.000Z',
  space: { id, nameEn, nameAr: null },
});

const HUB: FavoriteSpace = { listed: true, savedAt: '2026-10-27T09:00:00.000Z', space: LISTED };

/**
 * «المفضّلة» answered with `favorites` (changed by the test); each space that left has a «Remove»
 * that reads the favourites again, as the real one does once its removal is done.
 */
function renderView(initial: FavoriteSpace[]) {
  let favorites = initial;
  fakeTransport(() => ok(favorites));
  const client = createQueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <FavoritesView
          spaceLink={(slug) => `/spaces/${slug}`}
          areaName={() => 'Al-Rimal'}
          cardAction={(space) => (
            <button type="button" aria-pressed={space.saved}>
              Heart {space.name.text}
            </button>
          )}
          unlistedAction={(space) => (
            <button
              type="button"
              onClick={() => {
                favorites = favorites.filter((each) => each.space.id !== space.id);
                void client.invalidateQueries({ queryKey: ['me'] });
              }}
            >
              Remove {space.name.text}
            </button>
          )}
          browseLink="/spaces"
          chooseArea={vi.fn()}
          openMap={vi.fn()}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return {
    ...view,
    setFavorites: (next: FavoriteSpace[]) => {
      favorites = next;
    },
  };
}

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession(), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('FavoritesView', () => {
  it.each([390, 1440])(
    'draws the listed spaces as cards with their heart, then the ones that left with their action; axe-clean at %i',
    async (width) => {
      stubScreenWidth(width);
      const { container } = renderView([HUB, gone(9, 'Old Hub')]);

      const region = await screen.findByRole('region', { name: 'Saved spaces' });
      expect(await within(region).findByText('2 saved spaces')).toBeInTheDocument();
      expect(within(region).getByRole('link', { name: 'Masaha Hub' })).toHaveAttribute(
        'href',
        '/spaces/masaha-hub',
      );
      expect(within(region).getByRole('button', { name: 'Heart Masaha Hub' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      const old = within(region).getByRole('listitem');
      expect(within(old).getByRole('heading', { name: 'Old Hub' })).toBeInTheDocument();
      expect(within(old).queryByRole('link')).not.toBeInTheDocument();
      expect(
        within(old).getByText('This space is no longer listed in the directory'),
      ).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    },
  );

  it('hands the focus on when a removed space leaves: the next row, else the first heart, else the count', async () => {
    renderView([HUB, gone(9, 'Old Hub'), gone(10, 'Far Hub')]);

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Old Hub' }));
    await waitFor(() => {
      expect(screen.queryByText('Old Hub')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Remove Far Hub' })).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Remove Far Hub' }));
    await waitFor(() => {
      expect(screen.queryByText('Far Hub')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Heart Masaha Hub' })).toHaveFocus();
  });

  it('gives the count the focus when the last space that left goes and no card is there', async () => {
    renderView([gone(9, 'Old Hub')]);

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Old Hub' }));

    await waitFor(() => {
      expect(screen.getByText('0 saved spaces')).toHaveFocus();
    });
  });
});
