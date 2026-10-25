import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uncollectedPage, uncollectedVisit } from '../../../../test/deskVisit';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { UncollectedCard } from '../../components/uncollected/UncollectedCard';
import type { DeskAbilities } from '../../types/DeskAbilities';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

/** Twenty of the page's visits, each ₪25 owed: the first page of 21. */
const PAGE = Array.from({ length: 20 }, (_, index) =>
  uncollectedVisit({ id: 100 + index, visitorName: `Visitor ${String(index + 1)}` }),
);

function renderCard({
  abilities = { writeOff: true },
  entry = '/desk',
}: { abilities?: DeskAbilities; entry?: string } = {}) {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[entry]}>
        <UncollectedCard spaceId={7} abilities={abilities} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
});

describe('useUncollectedCard', () => {
  it('counts the visits from the page’s meta, with no money total; three rows, then all', async () => {
    const user = userEvent.setup();
    const requests = fakeTransport(() => uncollectedPage(PAGE, 21));
    renderCard();

    const card = await screen.findByRole('region', { name: '21 visits not collected' });
    expect(within(card).getByRole('heading', { level: 2 })).not.toHaveTextContent('₪');
    expect(within(card).getAllByRole('button', { name: 'Collect' })).toHaveLength(3);

    await user.click(within(card).getByRole('button', { name: 'Show all (21)' }));
    expect(within(card).getAllByRole('button', { name: 'Collect' })).toHaveLength(20);
    expect(
      within(card).getByRole('navigation', { name: 'Pages of uncollected visits' }),
    ).toBeVisible();
    expect(within(card).getByRole('button', { name: 'Show fewer' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(requests[0]?.url).toBe('/manage/spaces/7/uncollected-visits');
    expect(requests[0]?.params).toEqual({ page: 1 });
  });

  it('says how each row closed, and when, and what it still owes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T09:00:00.000Z'));
    fakeTransport(() =>
      uncollectedPage([
        uncollectedVisit(),
        uncollectedVisit({ id: 4, visitorName: 'Rami', checkoutMethod: 'MANUAL' }),
        uncollectedVisit({ id: 5, visitorName: 'Noor' }, null),
      ]),
    );
    renderCard();

    expect(
      await screen.findAllByText(heard('Auto check-out at closing · 6 Oct 14:00–22:00')),
    ).toHaveLength(2);
    // A hand-closed visit owing again after a void, as the server lists it (#114).
    expect(screen.getByText(heard('Checked out by hand · 6 Oct 14:00–22:00'))).toBeInTheDocument();
    expect(screen.getAllByText(heard('₪25'))).toHaveLength(2);
    // An unpriced visit is not collected before it is priced.
    expect(screen.getByText('No price')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Collect' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Record a debt' })).toHaveLength(3);
  });

  it('opens whole on arriving at #uncollected, its heading focused', async () => {
    fakeTransport(() => uncollectedPage(PAGE, 21));
    renderCard({ entry: '/desk#uncollected' });

    const heading = await screen.findByRole('heading', { name: '21 visits not collected' });
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Collect' })).toHaveLength(20);
    });
    expect(heading).toHaveFocus();
    expect(heading.closest('#uncollected')).not.toBeNull();
  });

  it('shows the owner «Write off…» in each row’s menu, and reception no menu', async () => {
    const user = userEvent.setup();
    fakeTransport(() => uncollectedPage([uncollectedVisit()]));
    renderCard({ abilities: { writeOff: true } });

    await user.click(
      await screen.findByRole('button', { name: heard('More actions for Khalid’s visit') }),
    );
    expect(await screen.findByRole('menuitem', { name: 'Write off…' })).toBeVisible();
  });

  it('shows reception no write-off', async () => {
    fakeTransport(() => uncollectedPage([uncollectedVisit()]));
    renderCard({ abilities: { writeOff: false } });

    expect(await screen.findByRole('button', { name: 'Collect' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Record a debt' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /More actions/ })).toBeNull();
  });

  it('shows the last page in place of one past it, never the empty line', async () => {
    const requests = fakeTransport((request) =>
      (request.params as { page: number }).page === 3
        ? uncollectedPage([], 21, 3)
        : uncollectedPage([uncollectedVisit({ id: 120, visitorName: 'Visitor 21' })], 21, 2),
    );
    renderCard({ entry: '/desk?uncollectedPage=3' });

    expect(await screen.findByText('Visitor 21')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Collect' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Pages of uncollected visits' })).toBeVisible();
    expect(screen.queryByText('Nothing left to collect.')).toBeNull();
    expect(requests.map((request) => request.params as unknown)).toEqual([
      { page: 3 },
      { page: 2 },
    ]);
  });

  it('says a failure with a retry, and that there is nothing to collect', async () => {
    let fail = true;
    fakeTransport(() => (fail ? refused(404, { type: 'not_found' }) : uncollectedPage([])));
    const user = userEvent.setup();
    renderCard();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t load the uncollected visits',
    );
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Nothing left to collect.')).toBeVisible();
    expect(screen.getByRole('heading', { name: '0 visits not collected' })).toBeVisible();
  });
});
