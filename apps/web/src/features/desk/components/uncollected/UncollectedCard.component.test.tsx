import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { uncollectedPage, uncollectedVisit } from '../../../../test/deskVisit';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { UncollectedCard } from './UncollectedCard';

const fileLink = (customerId: number) => `/file/${String(customerId)}`;

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

function renderCard({
  rows = [uncollectedVisit(), uncollectedVisit({ id: 4, visitorName: 'Rami' })],
  writeOff = true,
} = {}) {
  fakeTransport(() => uncollectedPage(rows));
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/desk']}>
        <UncollectedCard spaceId={7} abilities={{ writeOff }} fileLink={fileLink} />
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

  it('keeps its header and «Written off» on a phone for the owner when empty, hiding only the empty line', async () => {
    stubScreenWidth(390);
    renderCard({ rows: [] });

    const card = await screen.findByRole('region', { name: 'Not collected' });
    const line = await screen.findByText('Nothing left to collect.');
    // The written-off visits and their undo stay reachable below xl (finding 212).
    expect(card).not.toHaveClass('hidden');
    expect(within(card).getByRole('radio', { name: 'Written off' })).toBeInTheDocument();
    expect(line.closest('[data-slot="card-content"]')).toHaveClass('hidden', 'xl:flex');
  });

  it('is hidden whole below xl when empty for whoever cannot write off', async () => {
    stubScreenWidth(390);
    renderCard({ rows: [], writeOff: false });

    const card = await screen.findByRole('region', { name: 'Not collected' });
    await screen.findByText('Nothing left to collect.');
    expect(card).toHaveClass('hidden', 'xl:flex');
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

  it('leads a customer’s visit to their file, and marks the collection’s note optional', async () => {
    const user = userEvent.setup();
    fakeTransport(() =>
      uncollectedPage([
        uncollectedVisit({ id: 5, customer: { id: 40, name: 'Huda Saleh', phone: null } }),
        uncollectedVisit({ id: 4, visitorName: 'Rami' }),
      ]),
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={['/desk']}>
          <UncollectedCard spaceId={7} abilities={{ writeOff: false }} fileLink={fileLink} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('link', { name: 'Huda Saleh' })).toHaveAttribute(
      'href',
      '/file/40',
    );
    expect(screen.queryByRole('link', { name: 'Rami' })).toBeNull();
    const [collect] = screen.getAllByRole('button', { name: 'Collect' });
    await user.click(collect as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Optional')).toBeVisible();
  });
});
