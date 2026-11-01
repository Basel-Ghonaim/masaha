import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { customerFile, subscriptionState, SUBSCRIBED_AT } from '../../../../test/deskCustomer';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { CustomerFile } from '../file/CustomerFile';

/** Sara's file: one subscription, ₪150 fixed, ending 2026-10-30, a 12-day total. */
const SUBSCRIPTION = subscriptionState({ totalDays: 12 });
const FILE = customerFile({
  subscriptions: [
    { ...SUBSCRIPTION, paidAgorot: 15000, balanceAgorot: 0, createdAt: SUBSCRIBED_AT },
  ],
});

/** The card's «⋯», named by the subscription. */
const cardMenu = () => screen.getByRole('button', { name: /^More actions: .Exams by the hour.$/ });

/** Renders the file; `write` answers the corrections. */
function renderFile({
  owner = true,
  file = FILE,
  write = () => ok(SUBSCRIPTION),
}: {
  owner?: boolean;
  file?: typeof FILE;
  write?: () => FakeAnswer;
} = {}) {
  const requests = fakeTransport((request) => (request.method === 'get' ? ok(file) : write()));
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <main>
          <h1>Sara Khalid</h1>
          <CustomerFile
            spaceId={7}
            customerId={4}
            owner={owner}
            subscribe={() => undefined}
            spaceName={{ nameAr: null, nameEn: 'S' }}
          />
        </main>
      </MemoryRouter>
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  const writes = () => requests.filter((request) => request.method !== 'get');
  return { ...view, writes };
}

/** Opens the card's correction; its sheet. */
async function openCorrection(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { level: 3, name: 'Exams by the hour' });
  await user.click(cardMenu());
  await user.click(await screen.findByRole('menuitem', { name: 'Correct the subscription' }));
  return screen.findByRole('dialog', { name: /^Correct .Exams by the hour.$/ });
}

beforeEach(() => {
  startPreferences('en');
  stubScreenWidth(1440);
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('a subscription’s correction', () => {
  it('sends only the changed fields, the name focused first, the focus back to «⋯»; axe-clean', async () => {
    const user = userEvent.setup();
    const { writes, container } = renderFile();

    const sheet = await openCorrection(user);
    expect(within(sheet).getByRole('textbox', { name: 'Name' })).toHaveFocus();
    expect(await axe(container)).toHaveNoViolations();
    const total = within(sheet).getByRole('textbox', { name: 'Total days' });
    await user.clear(total);
    await user.type(total, '10');
    await user.type(within(sheet).getByRole('textbox', { name: 'Days a week' }), '3');
    await user.click(within(sheet).getByRole('button', { name: /To/ }));
    await user.click(await screen.findByRole('button', { name: 'No end date' }));
    await user.click(within(sheet).getByRole('button', { name: 'Save the correction' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(writes().map((request) => [request.method, request.url, bodyOf(request)])).toEqual([
      [
        'patch',
        '/manage/spaces/7/subscriptions/1',
        { endsOn: null, totalDays: 10, daysPerWeek: 3 },
      ],
    ]);
    expect(await screen.findByText('The subscription was corrected')).toBeVisible();
    expect(cardMenu()).toHaveFocus();
  });

  it('sends the price part, both its terms with why, after the terms', async () => {
    const user = userEvent.setup();
    const { writes } = renderFile();

    const sheet = await openCorrection(user);
    await user.type(within(sheet).getByRole('textbox', { name: 'Name' }), ' (fixed)');
    const price = within(sheet).getByRole('textbox', { name: 'Price (₪)' });
    await user.clear(price);
    await user.type(price, '120');
    await user.type(within(sheet).getByRole('textbox', { name: 'Why it is corrected' }), 'Deal');
    await user.click(within(sheet).getByRole('button', { name: 'Save the correction' }));

    await waitFor(() => {
      expect(writes()).toHaveLength(2);
    });
    expect(writes().map((request) => [request.method, request.url, bodyOf(request)])).toEqual([
      ['patch', '/manage/spaces/7/subscriptions/1', { name: 'Exams by the hour (fixed)' }],
      [
        'put',
        '/manage/spaces/7/subscriptions/1/price',
        { billing: 'FIXED', priceAgorot: 12000, reason: 'Deal' },
      ],
    ]);
  });

  it('shows reception no price section', async () => {
    const user = userEvent.setup();
    renderFile({ owner: false });

    const sheet = await openCorrection(user);
    expect(within(sheet).getByRole('group', { name: 'Name, dates and limits' })).toBeVisible();
    expect(within(sheet).queryByRole('group', { name: 'The price' })).toBeNull();
    expect(within(sheet).queryByRole('textbox', { name: 'Why it is corrected' })).toBeNull();
  });

  it('says PRICE_BELOW_PAID inside the sheet, every value kept, and sends the terms saved once', async () => {
    const user = userEvent.setup();
    const { writes } = renderFile({
      write: () =>
        writesSoFar() === 1
          ? ok({ ...SUBSCRIPTION, hoursPerDay: 4 })
          : refused(409, { type: 'conflict', code: 'PRICE_BELOW_PAID' }),
    });
    let count = 0;
    function writesSoFar() {
      count += 1;
      return count;
    }

    const sheet = await openCorrection(user);
    await user.type(within(sheet).getByRole('textbox', { name: 'Hours a day' }), '4');
    const price = within(sheet).getByRole('textbox', { name: 'Price (₪)' });
    await user.clear(price);
    await user.type(price, '50');
    await user.type(within(sheet).getByRole('textbox', { name: 'Why it is corrected' }), 'Deal');
    await user.click(within(sheet).getByRole('button', { name: 'Save the correction' }));

    expect(
      await within(sheet).findByText(/The price is below what was paid on it\./),
    ).toBeVisible();
    expect(screen.queryByText('The subscription was corrected')).toBeNull();
    expect(within(sheet).getByRole('textbox', { name: 'Price (₪)' })).toHaveValue('50');

    await user.click(within(sheet).getByRole('button', { name: 'Save the correction' }));
    await waitFor(() => {
      expect(writes()).toHaveLength(3);
    });
    // The hours were saved: the second attempt sends the price alone.
    expect(writes().map((request) => request.method)).toEqual(['patch', 'put', 'put']);
  });

  it('says an end before the start on «To»', async () => {
    const user = userEvent.setup();
    renderFile({
      write: () => refused(422, { type: 'validation', errors: { endsOn: ['out_of_range'] } }),
    });

    const sheet = await openCorrection(user);
    await user.type(within(sheet).getByRole('textbox', { name: 'Total hours' }), '20');
    await user.click(within(sheet).getByRole('button', { name: 'Save the correction' }));

    expect(await within(sheet).findByText('The end is before the start')).toBeVisible();
  });

  it('holds an ended subscription’s item, with its reason', async () => {
    const user = userEvent.setup();
    const ended = subscriptionState({
      status: 'EXPIRED',
      ended: { at: '2026-10-20T08:00:00.000Z', byId: 14 },
    });
    const { writes } = renderFile({
      file: customerFile({
        subscriptions: [
          { ...ended, paidAgorot: 15000, balanceAgorot: 0, createdAt: SUBSCRIBED_AT },
        ],
      }),
    });

    await screen.findByRole('heading', { level: 3, name: 'Exams by the hour' });
    await user.click(cardMenu());
    const item = await screen.findByRole('menuitem', {
      name: /^Correct the subscription\s*Ended early$/,
    });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    await user.click(item);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(writes()).toHaveLength(0);
  });
});
