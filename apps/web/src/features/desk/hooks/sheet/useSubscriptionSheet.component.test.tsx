import type { NewSubscription } from '@masaha/shared/desk';
import type { SpacePackage } from '@masaha/shared/packages';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { customerFile, customerRow, subscriptionState } from '../../../../test/deskCustomer';
import { deskVisit, visitTerms } from '../../../../test/deskVisit';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { findToast } from '../../../../test/findToast';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { SubscriptionSheet } from '../../components/sheet/SubscriptionSheet';
import type { SheetEntry } from '../../types/SheetEntry';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const TEN_DAYS: SpacePackage = {
  id: 3,
  name: '10 days',
  validityDays: 30,
  totalDays: 10,
  daysPerWeek: null,
  hoursPerDay: null,
  totalHours: null,
  billing: 'FIXED',
  priceAgorot: 15000,
  audience: 'GENERAL',
  shiftId: null,
  isActive: true,
};

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string | RegExp) => (content: string) => {
  const text = content.replace(/[⁦-⁩]/g, '');
  return typeof expected === 'string' ? text === expected : expected.test(text);
};

/** A subscribe's answer: the new subscription, the parts its payment made, the debt left. */
function subscribed(change: Partial<NewSubscription> = {}): FakeAnswer {
  const data: NewSubscription = {
    subscription: {
      ...subscriptionState({ id: 21, name: '10 days', packageId: 3, totalDays: 10 }),
      paidAgorot: 15000,
      balanceAgorot: 0,
    },
    payments: [],
    debtAgorot: 0,
    ...change,
  };
  return ok(data, 201);
}

/**
 * The sheet of space 7 for `entry`, the server answering the terms with `mayTypePrice`, a file with
 * `file`, and every write with `write`.
 */
function renderSheet(
  entry: SheetEntry,
  {
    write = () => subscribed(),
    mayTypePrice = false,
    file = customerFile(),
  }: {
    write?: (request: Request) => FakeAnswer;
    mayTypePrice?: boolean;
    file?: ReturnType<typeof customerFile>;
  } = {},
) {
  const requests = fakeTransport((request) => {
    if (request.method === 'get' && request.url?.endsWith('/visit-terms') === true) {
      return ok(visitTerms({ mayTypePrice }));
    }
    if (request.method === 'get') return ok(file);
    return write(request);
  });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <SubscriptionSheet
        spaceId={7}
        entry={entry}
        choices={{ state: 'ready', packages: [TEN_DAYS], retry: vi.fn(), shifts: [] }}
        onClose={onClose}
      />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { requests, onClose };
}

const posts = (requests: Request[]) =>
  requests
    .filter(({ method }) => method === 'post')
    .map((request) => ({
      url: request.url,
      key: request.headers.get('Idempotency-Key'),
      body: bodyOf(request),
    }));

const termsRead = (requests: Request[]) =>
  waitFor(() => {
    expect(requests.some(({ url }) => url?.endsWith('/visit-terms') === true)).toBe(true);
  });

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useSubscriptionSheet', () => {
  it('offers «Custom» only to whoever may type a price', async () => {
    const { requests } = renderSheet({ mode: 'subscribe', customer: customerRow() });
    await termsRead(requests);
    await screen.findByRole('radio', { name: /10 days/ });
    expect(screen.queryByRole('radio', { name: /Custom/ })).toBeNull();
  });

  it('requires the reason of a custom price, and sends nothing without it', async () => {
    const user = userEvent.setup();
    const { requests } = renderSheet(
      { mode: 'subscribe', customer: customerRow() },
      { mayTypePrice: true },
    );

    await user.click(await screen.findByRole('radio', { name: /Custom/ }));
    await user.type(screen.getByRole('textbox', { name: 'Price (₪)' }), '50');
    await user.click(screen.getByRole('button', { name: /Save and receive/ }));

    const reason = screen.getByRole('textbox', { name: 'Reason for the price' });
    await waitFor(() => {
      expect(reason).toHaveAccessibleDescription(/This field is required/);
    });
    expect(posts(requests)).toEqual([]);
  });

  it('creates a new customer then subscribes them with two keys; a refused subscribe keeps the customer and is sent alone', async () => {
    const user = userEvent.setup();
    let refuse = true;
    const { requests, onClose } = renderSheet(
      { mode: 'new', name: 'Sara Khalid' },
      {
        write: (request) => {
          if (request.url === '/manage/spaces/7/customers') {
            return ok({ id: 9, name: 'Sara Khalid', phone: null, archivedAt: null }, 201);
          }
          if (refuse) return refused(409, { type: 'conflict', code: 'CUSTOMER_ARCHIVED' });
          return subscribed({
            payments: [
              {
                item: { subscriptionId: 21 },
                payment: {
                  id: 5,
                  amountAgorot: 15000,
                  method: 'CASH',
                  note: null,
                  receivedAt: '2026-10-26T08:00:00Z',
                  recordedById: 1,
                },
              },
            ],
          });
        },
      },
    );

    await user.click(await screen.findByRole('button', { name: /Save and receive .?₪150.?$/ }));
    expect(
      await screen.findByText(
        heard('Sara Khalid was added to the customers; the subscription wasn’t saved.'),
      ),
    ).toBeVisible();
    const first = posts(requests);
    expect(first.map(({ url }) => url)).toEqual([
      '/manage/spaces/7/customers',
      '/manage/spaces/7/customers/9/subscriptions',
    ]);
    expect(first[0]?.body).toEqual({ name: 'Sara Khalid' });
    expect(first[0]?.key).not.toEqual(first[1]?.key);

    refuse = false;
    await user.click(screen.getByRole('button', { name: 'Save the subscription' }));
    await findToast(heard('Subscription saved · Sara Khalid'));
    const all = posts(requests);
    expect(all.map(({ url }) => url)).toEqual([
      '/manage/spaces/7/customers',
      '/manage/spaces/7/customers/9/subscriptions',
      '/manage/spaces/7/customers/9/subscriptions',
    ]);
    expect(all[2]?.key).toEqual(first[1]?.key);
    expect(all[2]?.body).toEqual(first[1]?.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('says a new customer saved with no subscription once the sheet is closed', async () => {
    const user = userEvent.setup();
    const { onClose } = renderSheet(
      { mode: 'new', name: 'Sara Khalid' },
      {
        write: (request) =>
          request.url === '/manage/spaces/7/customers'
            ? ok({ id: 9, name: 'Sara Khalid', phone: null, archivedAt: null }, 201)
            : refused(409, { type: 'conflict', code: 'CUSTOMER_ARCHIVED' }),
      },
    );

    await user.click(await screen.findByRole('button', { name: /Save and receive/ }));
    await screen.findByText(
      heard('Sara Khalid was added to the customers; the subscription wasn’t saved.'),
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await findToast(heard('Sara Khalid is in the customers, with no subscription.'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('asks a new customer’s phone while something stays owed', async () => {
    const user = userEvent.setup();
    const { requests } = renderSheet({ mode: 'new', name: 'Sara Khalid' });

    const received = await screen.findByRole('textbox', { name: 'Received now (₪)' });
    await user.clear(received);
    await user.type(received, '100');
    await user.click(screen.getByRole('button', { name: /Save and receive .?₪100.?$/ }));

    expect(
      await screen.findByText(
        heard('A mobile number is required: ₪50 stays owed, e.g. +970 59 000 0000'),
      ),
    ).toBeVisible();
    expect(posts(requests)).toEqual([]);
  });

  it('asks the prior debts plus the new price; the toast says the price, the parts and the debt from the answer, with the debt warning', async () => {
    const user = userEvent.setup();
    const visit = deskVisit({
      id: 12,
      checkedOutAt: '2026-10-20T10:00:00.000Z',
      checkoutMethod: 'MANUAL',
      charge: {
        amountAgorot: 2000,
        roundingRule: null,
        roundingMinutes: null,
        capApplied: null,
        typedById: null,
        reason: null,
      },
    });
    const payment = (id: number, amountAgorot: number) => ({
      id,
      amountAgorot,
      method: 'CASH' as const,
      note: null,
      receivedAt: '2026-10-26T08:00:00Z',
      recordedById: 1,
    });
    const { requests } = renderSheet(
      { mode: 'subscribe', customer: customerRow({ debtAgorot: 2000 }) },
      {
        file: customerFile({
          debtAgorot: 2000,
          unpaidVisits: [{ visit, payments: [], paidAgorot: 0, balanceAgorot: 2000 }],
        }),
        write: () => ({
          status: 201,
          data: {
            success: true,
            data: {
              // The server charged ₪160: the price changed after the sheet read it (finding 171).
              subscription: {
                ...subscriptionState({ id: 21, name: '10 days', packageId: 3, priceAgorot: 16000 }),
                paidAgorot: 15000,
                balanceAgorot: 1000,
              },
              payments: [
                { item: { visitId: 12 }, payment: payment(5, 2000) },
                { item: { subscriptionId: 21 }, payment: payment(6, 15000) },
              ],
              debtAgorot: 1000,
            } satisfies NewSubscription,
            meta: { warnings: ['CUSTOMER_HAS_DEBT'] },
          },
        }),
      },
    );

    expect(await screen.findByText(heard('Owed from before: ₪20'))).toBeVisible();
    const block = screen.getByRole('group', { name: 'Payment' });
    await waitFor(() => {
      expect(within(block).getByText(heard('₪170'))).toBeVisible();
    });
    await user.click(screen.getByRole('button', { name: /Save and receive .?₪170.?$/ }));

    const title = await findToast(heard('Subscription saved · Sara Khalid'));
    const lines = (title.closest('[data-sonner-toast]')?.textContent ?? '').replace(/[⁦-⁩]/g, '');
    expect(lines).toContain('10 days · ₪160');
    expect(lines).toMatch(/Visit of [^:]+: ₪20 received/);
    expect(lines).toContain('10 days: ₪150 received');
    expect(lines).toContain('₪10 stays owed');
    expect(lines).toContain('The customer still owes on an earlier item.');
    expect(posts(requests).map(({ body }) => body)).toEqual([
      {
        packageId: 3,
        startsOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as unknown,
        payment: { amountAgorot: 17000, method: 'CASH' },
      },
    ]);
  });
});
