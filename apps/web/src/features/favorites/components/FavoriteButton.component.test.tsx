import { createQueryClient } from '@shared/api';
import { establishSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { aSession } from '../../../test/fakeSession';
import { fakeTransport, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { FavoriteButton } from './FavoriteButton';

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

function renderHeart(saved: boolean) {
  fakeTransport(() => ({ status: 204 }));
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <FavoriteButton
        space={{ id: 7, name: { text: 'مساحة هب' } }}
        saved={saved}
        signIn={vi.fn()}
        manage={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession(), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
});

describe('FavoriteButton', () => {
  it('is a toggle named by what it does to the space, its heart unfilled; axe-clean', async () => {
    const { container } = renderHeart(false);

    const heart = screen.getByRole('button', { name: heard('Save مساحة هب to favourites') });
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    expect(heart.querySelector('svg')).not.toHaveClass('fill-current');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps its one name and is pressed, its heart filled, while the space is saved (a toggle)', () => {
    renderHeart(true);

    const heart = screen.getByRole('button', { name: heard('Save مساحة هب to favourites') });
    expect(heart).toHaveAttribute('aria-pressed', 'true');
    expect(heart.querySelector('svg')).toHaveClass('fill-current', 'text-primary');
  });
});
