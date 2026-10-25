import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { uncollectedPage, uncollectedVisit } from '../../../../test/deskVisit';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { UncollectedCard } from './UncollectedCard';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

function renderCard() {
  fakeTransport(() =>
    uncollectedPage([uncollectedVisit(), uncollectedVisit({ id: 4, visitorName: 'Rami' })]),
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/desk']}>
        <UncollectedCard spaceId={7} abilities={{ writeOff: true }} />
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

describe('UncollectedCard', () => {
  it('makes «Collect» the primary, names each row’s menu by its visit, and is axe-clean at 390', async () => {
    stubScreenWidth(390);
    renderCard();

    const [collect] = await screen.findAllByRole('button', { name: 'Collect' });
    expect(collect).toHaveClass('bg-primary');
    expect(screen.getAllByRole('button', { name: 'Record a debt' })[0]).not.toHaveClass(
      'bg-primary',
    );
    expect(
      screen.getByRole('button', { name: heard('More actions for Khalid’s visit') }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: heard('More actions for Rami’s visit') }),
    ).toBeVisible();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('gives the focus back to the row’s menu after its dialog, and to «Collect» after its own', async () => {
    const user = userEvent.setup();
    renderCard();

    const more = await screen.findByRole('button', {
      name: heard('More actions for Rami’s visit'),
    });
    await user.click(more);
    await user.click(await screen.findByRole('menuitem', { name: 'Write off…' }));
    await user.click(await screen.findByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(more).toHaveFocus();
    });

    const [collect] = screen.getAllByRole('button', { name: 'Collect' });
    await user.click(collect as HTMLElement);
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(collect).toHaveFocus();
    });
  });
});
