import { createQueryClient } from '@shared/api';
import { Toaster } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { customerRow, customersPage } from '../../../../test/deskCustomer';
import { deskVisit, visitTerms } from '../../../../test/deskVisit';
import { findToast } from '../../../../test/findToast';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { useVisitDialog } from '../../hooks/check-in/useVisitDialog';
import { VisitDialog } from '../visit/VisitDialog';
import { DeskSearch } from './DeskSearch';

const SARA = customerRow({ id: 4, name: 'Sara Khalid' });
const SAMIR = customerRow({ id: 5, name: 'Samir Odeh', phone: null, current: null });

/** The page's first group, as `occupancy` draws it: Sara is present. */
const present = {
  customerIds: new Set([4]),
  matches: (term: string) => (term === '' ? 0 : 1),
  group: (term: string) =>
    term === '' ? null : (
      <section aria-labelledby="here-now">
        <h2 id="here-now">Here now</h2>
        <p>Sara Khalid</p>
      </section>
    ),
};

function renderSearch(checkIn = vi.fn()) {
  fakeTransport(() => customersPage([SARA, SAMIR]));
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <main>
        <DeskSearch spaceId={7} present={present} checkIn={checkIn} receive={vi.fn()} />
      </main>
    </QueryClientProvider>,
  );
  return { ...view, checkIn };
}

/** The page's search and its visit dialog, as `DeskPage` composes them. */
function SearchWithVisit() {
  const visit = useVisitDialog({ spaceId: 7, shifts: [], full: false });
  return (
    <>
      <DeskSearch
        spaceId={7}
        present={present}
        checkIn={(name, after) => {
          visit.setOpen(true, name, after);
        }}
        receive={vi.fn()}
      />
      <VisitDialog dialog={visit} />
    </>
  );
}

function renderSearchWithVisit(checkIn: () => FakeAnswer) {
  fakeTransport((request) => {
    if (request.url === '/manage/spaces/7/visit-terms') return ok(visitTerms());
    return request.method === 'post' ? checkIn() : customersPage([]);
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <SearchWithVisit />
      <Toaster label="Notifications" />
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

describe('DeskSearch', () => {
  it('is named and controls its results; its groups are h2, its cards h3; its count is polite; axe-clean', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    const { container, checkIn } = renderSearch();

    const region = screen.getByRole('region', { name: 'Search' });
    const box = within(region).getByRole('searchbox', {
      name: 'Search by name or the mobile’s last digits',
    });
    await user.type(box, 'Sa');

    const customers = await screen.findByRole('heading', { level: 2, name: 'Customers' });
    const results = document.getElementById(box.getAttribute('aria-controls') ?? '');
    expect(results).not.toBeNull();
    expect(results).toContainElement(customers);
    expect(
      within(results as HTMLElement).getByRole('heading', { level: 2, name: 'Here now' }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { level: 3, name: 'Samir Odeh' })).toBeVisible();
    // Sara is present: she is in the first group, not a card.
    expect(screen.queryByRole('heading', { level: 3, name: 'Sara Khalid' })).toBeNull();
    expect(screen.getByText('2 results')).toHaveAttribute('aria-live', 'polite');

    await user.click(screen.getByRole('button', { name: /Check in a visit for/ }));
    expect(checkIn).toHaveBeenCalledWith('Sa', expect.anything());
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is cleared and focused after a named visit is checked in; a failed one keeps the term', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    let answer: FakeAnswer = refused(403, { type: 'forbidden' });
    renderSearchWithVisit(() => answer);

    const box = screen.getByRole('searchbox');
    await user.type(box, 'Omar');
    await user.click(await screen.findByRole('button', { name: /Check in a visit for/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Check in a visit' });
    await user.click(within(dialog).getByRole('button', { name: 'Check in' }));
    expect(await within(dialog).findByRole('alert')).toBeVisible();
    await user.keyboard('{Escape}');
    expect(box).toHaveValue('Omar');

    answer = ok(deskVisit({ visitorName: 'Omar' }), 201);
    await user.click(screen.getByRole('button', { name: /Check in a visit for/ }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Check in' }),
    );
    await findToast((content) => content.replace(/[⁦-⁩]/g, '') === 'Omar checked in');
    await waitFor(() => {
      expect(box).toHaveFocus();
    });
    expect(box).toHaveValue('');
  });

  it('takes the focus on arrival from 768 px, not at 390', () => {
    stubScreenWidth(768);
    const wide = renderSearch();
    expect(screen.getByRole('searchbox')).toHaveFocus();
    wide.unmount();

    stubScreenWidth(390);
    renderSearch();
    expect(screen.getByRole('searchbox')).not.toHaveFocus();
  });
});
