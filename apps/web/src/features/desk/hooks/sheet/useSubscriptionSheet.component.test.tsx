import type { NewSubscription } from '@masaha/shared/desk';
import type { SpacePackage } from '@masaha/shared/packages';
import type { Price } from '@masaha/shared/spaces';
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

/** The space's published student month, ₪200. */
const STUDENT_MONTH: Price = {
  period: 'MONTH',
  audience: 'STUDENT',
  shiftId: null,
  labelAr: null,
  labelEn: null,
  amountAgorot: 20000,
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
    statement,
    prices = [],
    state = 'ready',
  }: {
    write?: (request: Request) => FakeAnswer;
    mayTypePrice?: boolean;
    file?: ReturnType<typeof customerFile>;
    statement?: () => FakeAnswer;
    prices?: Price[];
    state?: 'ready' | 'failed';
  } = {},
) {
  const requests = fakeTransport((request) => {
    if (request.method === 'get' && request.url?.endsWith('/visit-terms') === true) {
      return ok(visitTerms({ mayTypePrice }));
    }
    if (request.method === 'get' && request.url?.includes('/subscriptions/') === true) {
      return statement?.() ?? ok({});
    }
    if (request.method === 'get') return ok(file);
    return write(request);
  });
  const onClose = vi.fn();
  const refreshPrices = vi.fn();
  const retryPackages = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <SubscriptionSheet
        spaceId={7}
        entry={entry}
        choices={{
          state,
          packages: [TEN_DAYS],
          retry: retryPackages,
          prices: { state: 'ready', list: prices, refresh: refreshPrices },
          shifts: [],
        }}
        returnFocus={() => null}
        onClose={onClose}
      />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { requests, onClose, refreshPrices, retryPackages };
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

  it('renews from the statement’s start, with the renewed one; a renewal renewed meanwhile is worded', async () => {
    const user = userEvent.setup();
    const renews = subscriptionState({
      id: 4,
      packageId: 3,
      name: '10 days',
      endsOn: '2026-11-04',
    });
    const statementOf = (renewal: { startsOn: string } | null) =>
      ok({ ...renews, paidAgorot: 15000, balanceAgorot: 0, renewal, renewedById: null });
    let renewal: { startsOn: string } | null = { startsOn: '2026-11-05' };
    const { requests } = renderSheet(
      { mode: 'renew', customer: customerRow(), renews },
      {
        statement: () => statementOf(renewal),
        write: () => {
          renewal = null;
          return refused(409, { type: 'conflict', code: 'SUBSCRIPTION_ALREADY_RENEWED' });
        },
      },
    );

    const sheet = await screen.findByRole('dialog', { name: 'Renew subscription' });
    expect(await within(sheet).findByText('10 days')).toBeVisible();
    expect(within(sheet).getByRole('button', { name: 'Change package' })).toBeVisible();
    await waitFor(() => {
      expect(within(sheet).getByLabelText('From')).toHaveValue('2026-11-05');
    });
    await user.click(within(sheet).getByRole('button', { name: /Renew and receive .?₪150.?$/ }));

    expect(
      (await within(sheet).findAllByText(/This subscription was already renewed\./))[0],
    ).toBeVisible();
    // Read again, the statement says it was renewed: the sheet now makes a new subscription.
    expect(await screen.findByRole('dialog', { name: 'New subscription' })).toBeVisible();
    expect(posts(requests).map(({ body }) => body)).toEqual([
      {
        packageId: 3,
        startsOn: '2026-11-05',
        renewalOfId: 4,
        payment: { amountAgorot: 15000, method: 'CASH' },
      },
    ]);
  });

  it('subscribes from a published price by its key and name, never a price id, at the price’s amount', async () => {
    const user = userEvent.setup();
    const { requests } = renderSheet(
      { mode: 'subscribe', customer: customerRow() },
      { prices: [STUDENT_MONTH] },
    );

    const choice = await screen.findByRole('radio', { name: /Monthly · students/ });
    expect(choice).toBeChecked();
    await user.click(screen.getByRole('button', { name: /Save and receive .?₪200.?$/ }));

    await findToast(heard('Subscription saved · Sara Khalid'));
    const [sent] = posts(requests);
    expect(sent?.body).toEqual({
      published: { period: 'MONTH', audience: 'STUDENT', name: 'Monthly · students' },
      startsOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as unknown,
      payment: { amountAgorot: 20000, method: 'CASH' },
    });
    expect(sent?.body).not.toHaveProperty('priceId');
  });

  it.each([
    [
      'changed or removed',
      refused(422, { type: 'validation', errors: { published: ['invalid_choice'] } }),
      /This published price changed or was removed/,
    ],
    [
      'now lower than the amount',
      refused(409, { type: 'conflict', code: 'PAYMENT_EXCEEDS_DUE' }),
      /The amount is more than is due now/,
    ],
  ])(
    'says a published price %s, keeps the sheet, and reads the prices again',
    async (_case, answer, line) => {
      const user = userEvent.setup();
      const { refreshPrices, onClose } = renderSheet(
        { mode: 'subscribe', customer: customerRow() },
        { prices: [STUDENT_MONTH], write: () => answer },
      );

      await screen.findByRole('radio', { name: /Monthly · students/ });
      await user.click(screen.getByRole('button', { name: /Save and receive .?₪200.?$/ }));

      expect(await screen.findByText(line)).toBeVisible();
      expect(refreshPrices).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('radio', { name: /Monthly · students/ })).toBeChecked();
    },
  );

  it('shows every choice on «Change package», and sends nothing', async () => {
    const user = userEvent.setup();
    const renews = subscriptionState({ id: 4, packageId: 3, name: '10 days' });
    const { requests } = renderSheet(
      { mode: 'renew', customer: customerRow(), renews },
      {
        statement: () =>
          ok({
            ...renews,
            paidAgorot: 15000,
            balanceAgorot: 0,
            renewal: { startsOn: '2026-11-05' },
            renewedById: null,
          }),
      },
    );

    await user.click(await screen.findByRole('button', { name: 'Change package' }));
    expect(await screen.findByRole('radio', { name: /10 days/ })).toBeChecked();
    expect(posts(requests)).toEqual([]);
  });

  it('reads the choices again on «Try again» when they failed, and sends nothing', async () => {
    const user = userEvent.setup();
    const { requests, retryPackages, refreshPrices } = renderSheet(
      { mode: 'subscribe', customer: customerRow() },
      { state: 'failed' },
    );

    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(retryPackages).toHaveBeenCalledTimes(1);
    expect(refreshPrices).toHaveBeenCalledTimes(1);
    expect(posts(requests)).toEqual([]);
  });

  it('says no answer, not «not saved», when the subscribe’s answer is lost, and retries with its key', async () => {
    const user = userEvent.setup();
    const { requests, onClose } = renderSheet(
      { mode: 'new', name: 'Sara Khalid', phone: '0599000305' },
      {
        write: (request) => {
          if (request.url === '/manage/spaces/7/customers') {
            return ok(
              { id: 9, name: 'Sara Khalid', phone: '+970599000305', archivedAt: null },
              201,
            );
          }
          return { failure: 'ERR_NETWORK' };
        },
      },
    );

    await user.click(await screen.findByRole('button', { name: /Save and receive .?₪150.?$/ }));
    expect(
      await screen.findByText(
        'No answer came back. Try again — it won’t be recorded twice.',
        {},
        { timeout: 8000 },
      ),
    ).toBeVisible();
    expect(screen.queryByText(/the subscription wasn’t saved/)).toBeNull();
    const lost = posts(requests).filter(({ url }) => url?.endsWith('/subscriptions') === true);
    expect(new Set(lost.map(({ key }) => key)).size).toBe(1);

    // Closed now, the sheet says nothing definite: the subscription may have been recorded.
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/with no subscription/)).toBeNull();
  });

  it('retries a lost subscribe with the same key, the customer not created again', async () => {
    const user = userEvent.setup();
    let lose = true;
    const { requests } = renderSheet(
      { mode: 'new', name: 'Sara Khalid', phone: '0599000305' },
      {
        write: (request) => {
          if (request.url === '/manage/spaces/7/customers') {
            return ok(
              { id: 9, name: 'Sara Khalid', phone: '+970599000305', archivedAt: null },
              201,
            );
          }
          return lose ? { failure: 'ERR_NETWORK' } : subscribed();
        },
      },
    );

    await user.click(await screen.findByRole('button', { name: /Save and receive .?₪150.?$/ }));
    await screen.findByText(
      'No answer came back. Try again — it won’t be recorded twice.',
      {},
      { timeout: 8000 },
    );
    lose = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await findToast(heard('Subscription saved · Sara Khalid'));
    const sent = posts(requests);
    expect(sent.filter(({ url }) => url === '/manage/spaces/7/customers')).toHaveLength(1);
    const subscribes = sent.filter(({ url }) => url?.endsWith('/subscriptions') === true);
    expect(new Set(subscribes.map(({ key }) => key)).size).toBe(1);
  });

  it('renews a subscription from a published price with that price chosen, its amount on the submit', async () => {
    const renews = subscriptionState({
      id: 4,
      packageId: null,
      priceTyped: null,
      name: 'Monthly',
      priceAgorot: 35000,
      startsOn: '2026-10-01',
      endsOn: '2026-10-30',
    });
    renderSheet(
      { mode: 'renew', customer: customerRow(), renews },
      {
        prices: [
          { ...STUDENT_MONTH, period: 'WEEK', audience: 'GENERAL', amountAgorot: 12000 },
          { ...STUDENT_MONTH, audience: 'GENERAL', amountAgorot: 35000 },
        ],
        statement: () =>
          ok({
            ...renews,
            paidAgorot: 35000,
            balanceAgorot: 0,
            renewal: { startsOn: '2026-10-31' },
            renewedById: null,
          }),
      },
    );

    const sheet = await screen.findByRole('dialog', { name: 'Renew subscription' });
    expect(await within(sheet).findByRole('button', { name: 'Change package' })).toBeVisible();
    expect(within(sheet).getByText('Monthly')).toBeVisible();
    expect(
      await within(sheet).findByRole('button', { name: /Renew and receive .?₪350.?$/ }),
    ).toBeEnabled();
  });

  it('chooses nothing for a renewal it cannot match, the submit blocked until a choice', async () => {
    const user = userEvent.setup();
    const renews = subscriptionState({
      id: 4,
      packageId: null,
      priceTyped: null,
      name: 'An old offer',
      priceAgorot: 9000,
      startsOn: '2026-10-01',
      endsOn: '2026-10-10',
    });
    renderSheet(
      { mode: 'renew', customer: customerRow(), renews },
      {
        prices: [{ ...STUDENT_MONTH, period: 'WEEK', audience: 'GENERAL', amountAgorot: 12000 }],
        statement: () =>
          ok({
            ...renews,
            paidAgorot: 9000,
            balanceAgorot: 0,
            renewal: { startsOn: '2026-10-26' },
            renewedById: null,
          }),
      },
    );

    const weekly = await screen.findByRole('radio', { name: /Weekly/ });
    await waitFor(() => {
      expect(screen.getByLabelText('From')).toHaveValue('2026-10-26');
    });
    expect(weekly).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /10 days/ })).not.toBeChecked();
    const submit = screen.getByRole('button', { name: /Renew without payment/ });
    expect(submit).toBeDisabled();
    await user.click(weekly);
    expect(screen.getByRole('button', { name: /Renew and receive .?₪120.?$/ })).toBeEnabled();
  });

  it.each([
    ['₪200 on a ₪150 price records ₪150', '200', 15000],
    ['₪100 on a ₪150 price records ₪100', '100', 10000],
  ])('sends the amount recorded, never the amount typed: %s', async (_case, typed, recorded) => {
    const user = userEvent.setup();
    const { requests } = renderSheet({ mode: 'subscribe', customer: customerRow() });

    await screen.findByRole('radio', { name: /10 days/ });
    const received = screen.getByRole('textbox', { name: 'Received now (₪)' });
    await user.clear(received);
    await user.type(received, typed);
    await user.click(screen.getByRole('button', { name: /Save and receive/ }));

    await findToast(heard('Subscription saved · Sara Khalid'));
    const [sent] = posts(requests);
    expect(sent?.body).toMatchObject({ payment: { amountAgorot: recorded, method: 'CASH' } });
  });
});
