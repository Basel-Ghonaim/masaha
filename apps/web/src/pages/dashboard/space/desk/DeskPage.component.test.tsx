import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { checkedOut, subscriptionState } from '../../../../test/deskCustomer';
import { uncollectedPage, uncollectedVisit, visitTerms } from '../../../../test/deskVisit';
import { findToast } from '../../../../test/findToast';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { PageHeaderSlot } from '../../shell/PageHeaderSlot';
import { DeskPage } from './DeskPage';

/** The desk's state now, with no one present. */
const NO_ONE_PRESENT = {
  status: 'AVAILABLE',
  capacity: 40,
  present: 0,
  override: null,
  people: [],
};

type Answers = {
  occupancy?: () => FakeAnswer;
  uncollected?: () => FakeAnswer;
  checkOut?: () => FakeAnswer;
};

function renderDesk({
  occupancy = () => ok(NO_ONE_PRESENT),
  uncollected = () => uncollectedPage([uncollectedVisit()]),
  checkOut = () => ok(checkedOut(4000)),
}: Answers = {}) {
  const requests = fakeTransport((request) => {
    const url = request.url ?? '';
    if (url.endsWith('/check-out')) return checkOut();
    if (url.endsWith('/occupancy')) return occupancy();
    if (url.endsWith('/uncollected-visits')) return uncollected();
    if (url.endsWith('/visit-terms')) return ok(visitTerms());
    if (url.endsWith('/check-ins')) return ok([]);
    return ok({ id: 7, hours: null });
  });
  // The top bar's place, where the page puts «تسجيل زيارة» from 768 px.
  const slot = document.createElement('div');
  document.body.append(slot);
  slots.push(slot);
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider
        router={createMemoryRouter(
          [
            {
              path: '/dashboard/spaces/:spaceId/desk',
              element: (
                <PageHeaderSlot value={slot}>
                  <DeskPage />
                </PageHeaderSlot>
              ),
            },
          ],
          { initialEntries: ['/dashboard/spaces/7/desk'] },
        )}
      />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { ...view, requests };
}

/** Sara, here on her subscription. */
const SARA_HERE = {
  ...NO_ONE_PRESENT,
  present: 1,
  people: [
    {
      kind: 'CHECK_IN',
      id: 3,
      customerId: 4,
      name: 'Sara Khalid',
      since: '2026-10-25T07:00:00.000Z',
    },
  ],
};

/** The top bars made, removed after each test. */
const slots: HTMLElement[] = [];
/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const plain = (content: string) => content.replace(/[⁦-⁩]/g, '');

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  for (const slot of slots.splice(0)) slot.remove();
  act(() => {
    toast.dismiss();
  });
  restoreTransport();
});

describe('DeskPage', () => {
  it('puts the uncollected card before who is here, and hides it below xl when empty', async () => {
    const { unmount } = renderDesk();
    const uncollected = await screen.findByRole('region', { name: '1 visit not collected' });
    const present = await screen.findByRole('heading', { name: /Present now/ });
    // The DOM's order is the phone's: search, then uncollected, then who is here (K1).
    expect(
      uncollected.compareDocumentPosition(present) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(uncollected).not.toHaveClass('hidden');
    unmount();
    restoreTransport();

    renderDesk({ uncollected: () => uncollectedPage([]) });
    const empty = await screen.findByRole('region', { name: 'Not collected' });
    expect(await screen.findByText('Nothing left to collect.')).toBeInTheDocument();
    expect(empty).toHaveClass('hidden', 'xl:flex');
  });

  it('is full by the count, with its ratio, not by a manual «Full»', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    const { unmount } = renderDesk({
      occupancy: () => ok({ ...NO_ONE_PRESENT, status: 'AVAILABLE', capacity: 2, present: 2 }),
    });
    await user.click(await screen.findByRole('button', { name: 'Check in a visit' }));
    expect(
      await screen.findByText((content) =>
        plain(content).startsWith('The space is full 2/2; you can still check in'),
      ),
    ).toBeVisible();
    unmount();
    restoreTransport();

    renderDesk({ occupancy: () => ok({ ...NO_ONE_PRESENT, status: 'FULL' }) });
    await user.click(await screen.findByRole('button', { name: 'Check in a visit' }));
    expect(await screen.findByRole('dialog', { name: 'Check in a visit' })).toBeVisible();
    expect(screen.queryByText(/^The space is full/)).toBeNull();
  });

  it('opens a usage-based subscriber’s due after the tap, and receives it on the subscription', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    const { requests } = renderDesk({
      occupancy: () => ok(SARA_HERE),
      checkOut: () =>
        ok({
          ...checkedOut(4000),
          subscription: subscriptionState({ name: 'Hours', billing: 'PER_HOUR', priceAgorot: 500 }),
        }),
    });
    await user.click(await screen.findByRole('button', { name: /Check out .*Sara Khalid/ }));

    const dialog = await screen.findByRole('dialog', { name: /Sara Khalid.* checked out/ });
    expect(dialog).toHaveAccessibleDescription(/^Today \W?2:05\W? · paid \W?₪60\W?$/u);
    expect(screen.getByText((content) => plain(content) === 'Left on Hours: ₪40')).toBeVisible();
    await user.click(screen.getByRole('button', { name: (name) => plain(name) === 'Receive ₪40' }));
    await vi.waitFor(() => {
      expect(requests.some((request) => request.url?.endsWith('/payments') === true)).toBe(true);
    });
    const payment = requests.find((request) => request.url?.endsWith('/payments') === true);
    expect(JSON.parse(String(payment?.data))).toEqual({
      subscriptionId: 1,
      amountAgorot: 4000,
      method: 'CASH',
    });
  });

  it('keeps a fixed subscriber’s check-out one tap, with its toast', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    renderDesk({ occupancy: () => ok(SARA_HERE) });
    await user.click(await screen.findByRole('button', { name: /Check out .*Sara Khalid/ }));
    await findToast((content) => plain(content).startsWith('Sara Khalid checked out'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the offline state when who is here and the uncollected get no answer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderDesk({
      occupancy: () => ({ failure: 'ERR_NETWORK' }),
      uncollected: () => ({ failure: 'ERR_NETWORK' }),
    });
    // The transport re-sends a lost read twice, after 1 s and 2 s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_500);
    });
    expect(await screen.findAllByText('No internet connection')).toHaveLength(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
