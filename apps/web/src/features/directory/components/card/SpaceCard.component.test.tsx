import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { startPreferences } from '../../../../test/startPreferences';
import type { SpaceCardView } from '../../types/SpaceCardView';
import { SpaceCard } from './SpaceCard';

const CARD: SpaceCardView = {
  key: 7,
  slug: 'masaha-hub',
  name: { text: 'Masaha Hub' },
  mark: 'M',
  areaId: 2,
  cover: null,
  status: { label: 'Available', variant: 'success' },
  noStatus: 'No live status',
  verified: 'Verified',
  today: 'Open today 08:00–22:00',
  distance: null,
};

function renderCard(action?: ReactNode) {
  return render(
    <MemoryRouter>
      <SpaceCard card={CARD} href="/spaces/masaha-hub" areaName="Al-Rimal" action={action} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  startPreferences('en');
});

describe('SpaceCard', () => {
  it('stands its action beside the card’s link, never inside it: one link, one button; axe-clean', async () => {
    const { container } = renderCard(<button type="button">Save Masaha Hub</button>);

    const link = screen.getByRole('link', { name: 'Masaha Hub' });
    const button = screen.getByRole('button', { name: 'Save Masaha Hub' });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(link).not.toContainElement(button);
    expect(link).toHaveAttribute('href', '/spaces/masaha-hub');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is the link alone with no action', () => {
    renderCard();

    expect(screen.getByRole('link', { name: 'Masaha Hub' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
