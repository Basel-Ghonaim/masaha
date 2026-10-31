import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../../test/startPreferences';
import { HomeSearch } from './HomeSearch';
import { OwnersCard } from './OwnersCard';

// The shared bound, moved off its value, so the field is seen to read it rather than a literal.
vi.mock('@masaha/shared/spaces', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@masaha/shared/spaces')>()),
  SPACE_NAME_MAX_LENGTH: 61,
}));

beforeEach(() => {
  startPreferences('en');
});

describe('Home’s parts', () => {
  it('bounds the hero’s search by the shared constant of a space’s name', () => {
    render(
      <MemoryRouter>
        <HomeSearch />
      </MemoryRouter>,
    );

    expect(screen.getByRole('searchbox')).toHaveAttribute('maxLength', '61');
  });

  it('tells owners their space’s live status shows automatically from the check-ins', () => {
    render(
      <MemoryRouter>
        <OwnersCard />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        'Contact us to add your space and manage its hours and prices; its live status shows automatically from the check-ins.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute(
      'href',
      '/about#owners',
    );
  });
});
