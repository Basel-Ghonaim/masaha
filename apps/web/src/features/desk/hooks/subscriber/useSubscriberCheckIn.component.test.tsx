import type { CustomerRow } from '@masaha/shared/desk';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { customerRow, deskCheckIn, subscriptionState } from '../../../../test/deskCustomer';
import { deskVisit } from '../../../../test/deskVisit';
import { findToast } from '../../../../test/findToast';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { CustomerCard } from '../../components/card/CustomerCard';

/** The cards' «⋯» as reception's desk passes it. */
const MENU = {
  owner: false,
  fileLink: (id: number) => `/file/${String(id)}`,
  subscribe: () => undefined,
};

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const posts = (requests: Request[]) => requests.filter(({ method }) => method === 'post');
const keysOf = (requests: Request[]) =>
  posts(requests).map(({ headers }) => headers.get('Idempotency-Key') as string);

function renderCard(
  row: CustomerRow,
  answer: (request: Request) => FakeAnswer | Promise<FakeAnswer>,
) {
  const requests = fakeTransport(answer);
  const done = vi.fn();
  const focus = createRef<HTMLInputElement>();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <input ref={focus} aria-label="Search" />
      <CustomerCard spaceId={7} row={row} after={{ done, focus }} receive={vi.fn()} menu={MENU} />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { requests, done };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useSubscriberCheckIn', () => {
  it('checks an active subscription in at once, with one key per check-in', async () => {
    const user = userEvent.setup();
    const { requests, done } = renderCard(customerRow(), () => ok(deskCheckIn(), 201));

    await user.click(screen.getByRole('button', { name: heard('Check in Sara Khalid') }));
    await findToast(heard('Sara Khalid checked in'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(posts(requests).map(({ url }) => url)).toEqual(['/manage/spaces/7/check-ins']);
    expect(bodyOf(posts(requests)[0])).toEqual({ subscriptionId: 1 });
    expect(done).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: heard('Check in Sara Khalid') }));
    await waitFor(() => {
      expect(done).toHaveBeenCalledTimes(2);
    });
    const [first, second] = keysOf(requests);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).not.toBe(first);
  });

  it('keeps the key across a retry after no answer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let attempt = 0;
    const { requests } = renderCard(customerRow(), () => {
      attempt += 1;
      return attempt <= 3 ? { failure: 'ERR_NETWORK' } : ok(deskCheckIn(), 201);
    });

    await user.click(screen.getByRole('button', { name: heard('Check in Sara Khalid') }));
    // The transport sends it twice more, after 1 s and 2 s, before it says no answer came back.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    await findToast('No answer came back. Try again — it won’t be recorded twice.');
    // Sonner's action pressed by Enter: jsdom has no pointer capture.
    screen.getByRole('button', { name: 'Try again' }).focus();
    await user.keyboard('{Enter}');
    await findToast(heard('Sara Khalid checked in'));

    const keys = keysOf(requests);
    expect(keys).toHaveLength(4);
    expect(new Set(keys).size).toBe(1);
  });

  it('opens the choice first for no subscription, an expired one, or one not started', async () => {
    const user = userEvent.setup();
    const expired = renderCard(
      customerRow({
        current: { id: 1, name: 'Exams', packageId: 4, endsOn: '2026-10-21', status: 'EXPIRED' },
      }),
      () => ok(deskCheckIn(), 201),
    );
    await user.click(screen.getByRole('button', { name: heard('Check in Sara Khalid') }));
    const dialog = await screen.findByRole('dialog', { name: heard('Check in · Sara Khalid') });
    expect(
      within(dialog).getByText(heard('The subscription “Exams” ended on 21 October.')),
    ).toBeVisible();
    expect(posts(expired.requests)).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Check in anyway' }));
    await findToast(heard('Sara Khalid checked in'));
    expect(bodyOf(posts(expired.requests)[0])).toEqual({ subscriptionId: 1 });
  });

  it('checks one with no subscription in as a visit by their name, its own intent', async () => {
    const user = userEvent.setup();
    const { requests, done } = renderCard(customerRow({ current: null }), () =>
      ok(deskVisit({ visitorName: 'Sara Khalid' }), 201),
    );

    await user.click(screen.getByRole('button', { name: heard('Check in Sara Khalid') }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('No subscription.');
    expect(screen.queryByRole('button', { name: 'Check in anyway' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Check in as a visit' }));

    await findToast(heard('Sara Khalid checked in'));
    expect(posts(requests).map(({ url }) => url)).toEqual(['/manage/spaces/7/visits']);
    expect(bodyOf(posts(requests)[0])).toEqual({ visitorName: 'Sara Khalid', audience: 'GENERAL' });
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('reads a coming subscription’s start from the file', async () => {
    const user = userEvent.setup();
    renderCard(
      customerRow({
        current: { id: 1, name: 'Exams', packageId: 4, endsOn: '2026-11-30', status: 'UPCOMING' },
      }),
      (request) =>
        request.method === 'get'
          ? ok({
              customer: { id: 4, name: 'Sara Khalid', phone: null, archivedAt: null },
              debtAgorot: 0,
              creditAgorot: 0,
              present: null,
              subscriptions: [
                {
                  ...subscriptionState({ startsOn: '2026-11-01', status: 'UPCOMING' }),
                  paidAgorot: 0,
                  balanceAgorot: 15000,
                },
              ],
              unpaidVisits: [],
            })
          : ok(deskCheckIn(), 201),
    );

    await user.click(screen.getByRole('button', { name: heard('Check in Sara Khalid') }));
    expect(
      await screen.findByText(heard('The subscription “Exams” starts on 1 November.')),
    ).toBeVisible();
  });

  it('says when a coming subscription’s file fails, with its retry, then the start date', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let fails = true;
    renderCard(
      customerRow({
        current: { id: 1, name: 'Exams', packageId: 4, endsOn: '2026-11-30', status: 'UPCOMING' },
      }),
      () =>
        fails
          ? refused(500, { type: 'server' })
          : ok({
              customer: { id: 4, name: 'Sara Khalid', phone: null, archivedAt: null },
              debtAgorot: 0,
              creditAgorot: 0,
              present: null,
              subscriptions: [
                {
                  ...subscriptionState({ startsOn: '2026-11-01', status: 'UPCOMING' }),
                  paidAgorot: 0,
                  balanceAgorot: 15000,
                },
              ],
              unpaidVisits: [],
            }),
    );

    await user.click(screen.getByRole('button', { name: heard('Check in Sara Khalid') }));
    const dialog = await screen.findByRole('dialog');
    // The transport sends the read twice more, after 1 s and 2 s, before it fails.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t read when the subscription starts');
    expect(dialog.querySelector('[data-slot="skeleton"]')).toBeNull();

    fails = false;
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(
      await within(dialog).findByText(heard('The subscription “Exams” starts on 1 November.')),
    ).toBeVisible();
    expect(within(dialog).queryByRole('alert')).toBeNull();
  });

  it('says they are already here, the server’s warnings after, and clears and focuses the search', async () => {
    const user = userEvent.setup();
    let here = true;
    const { done } = renderCard(customerRow(), () =>
      here
        ? refused(409, { type: 'conflict', code: 'MEMBER_ALREADY_CHECKED_IN' })
        : {
            status: 201,
            data: {
              success: true,
              data: deskCheckIn(),
              meta: { warnings: ['DAYS_PER_WEEK_USED'] },
            },
          },
    );

    await user.click(screen.getByRole('button', { name: heard('Check in Sara Khalid') }));
    await findToast(heard('Sara Khalid is already here.'));
    expect(done).not.toHaveBeenCalled();

    here = false;
    await user.click(screen.getByRole('button', { name: heard('Check in Sara Khalid') }));
    await findToast(heard('Sara Khalid checked in'));
    expect(
      screen.getByText("This week's days are used up; the check-in was recorded anyway."),
    ).toBeInTheDocument();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('sends the search the focus after a check-in from the choice', async () => {
    const user = userEvent.setup();
    renderCard(customerRow({ current: null }), () => ok(deskVisit(), 201));

    await user.click(screen.getByRole('button', { name: heard('Check in Sara Khalid') }));
    await user.click(await screen.findByRole('button', { name: 'Check in as a visit' }));
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus();
    });
  });
});
