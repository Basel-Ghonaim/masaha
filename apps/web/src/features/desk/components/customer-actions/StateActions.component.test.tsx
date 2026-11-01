import type { CustomerFile } from '@masaha/shared/desk';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import {
  checkedOut,
  customerFile,
  customerRow,
  customersPage,
  subscriptionState,
  SUBSCRIBED_AT,
} from '../../../../test/deskCustomer';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { deskVisit } from '../../../../test/deskVisit';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import type { OpenSheet } from '../../types/SheetEntry';
import { CustomersList } from '../customers/CustomersList';
import { CustomerFile as CustomerFileView } from '../file/CustomerFile';

/** A name with the Unicode isolates around its values removed, as a reader hears it. */
const plain = (text: string | null) => (text ?? '').replace(/[⁦-⁩]/g, '');
const heard = (expected: string) => (content: string) => plain(content) === expected;

/** Sara, here now on her subscription's check-in 3. */
const PRESENT = customerFile({
  present: { kind: 'CHECK_IN', id: 3, subscriptionId: 1, since: '2026-10-25T07:00:00.000Z' },
});

/** Omar, away, owing a visit's ₪15 (the oldest) and ₪50 on his subscription. */
const OWING = customerFile({
  customer: { id: 5, name: 'Omar', phone: null, archivedAt: null },
  debtAgorot: 6500,
  subscriptions: [
    {
      ...subscriptionState({ id: 2, customerId: 5 }),
      paidAgorot: 10000,
      balanceAgorot: 5000,
      createdAt: SUBSCRIBED_AT,
    },
  ],
  unpaidVisits: [
    {
      visit: deskVisit({
        id: 3,
        checkedOutAt: '2026-10-24T15:00:00Z',
        checkoutMethod: 'MANUAL',
        charge: {
          amountAgorot: 2500,
          roundingRule: null,
          roundingMinutes: null,
          capApplied: null,
          typedById: null,
          reason: null,
        },
      }),
      payments: [],
      paidAgorot: 1000,
      balanceAgorot: 1500,
    },
  ],
});

/** A file whose one subscription has `status`. */
const fileWith = (status: 'ACTIVE' | 'ENDING_SOON' | 'EXPIRED') =>
  customerFile({
    subscriptions: [
      {
        ...subscriptionState({ status }),
        paidAgorot: 15000,
        balanceAgorot: 0,
        createdAt: SUBSCRIBED_AT,
      },
    ],
  });

function renderList(files: Record<number, CustomerFile>) {
  const requests = fakeTransport((request) => {
    const id = /\/customers\/(\d+)$/.exec(request.url ?? '')?.[1];
    if (id !== undefined) return ok(files[Number(id)]);
    if (request.url?.endsWith('/check-out') === true) return ok(checkedOut(0));
    return customersPage([
      customerRow({ id: 4, name: 'Sara Khalid' }),
      customerRow({ id: 5, name: 'Omar', phone: null, debtAgorot: 6500 }),
    ]);
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <main>
          <CustomersList
            spaceId={7}
            owner
            fileLink={(id) => `/file/${String(id)}`}
            subscribe={() => undefined}
            add={() => undefined}
          />
        </main>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return requests;
}

function renderFile(file: CustomerFile, subscribe = vi.fn<OpenSheet>()) {
  fakeTransport(() => ok(file));
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <main>
          <h1>Sara Khalid</h1>
          <CustomerFileView spaceId={7} customerId={4} owner subscribe={subscribe} spaceName="S" />
        </main>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, subscribe };
}

/** The header's actions, by the names a reader hears, in their order. */
async function headerActions() {
  await screen.findByRole('button', { name: /^More actions: .Sara Khalid.$/ });
  return within(screen.getByRole('group', { name: 'Actions' })).getAllByRole('button');
}

beforeEach(() => {
  startPreferences('en');
  stubScreenWidth(1440);
});

afterEach(() => {
  restoreTransport();
});

describe('a customer’s state actions', () => {
  it('a present customer’s menu offers «Check out», an owing one «Receive {amount}» on the oldest item', async () => {
    const user = userEvent.setup();
    const requests = renderList({ 4: PRESENT, 5: OWING });

    await user.click(await screen.findByRole('button', { name: /^More actions: .Sara Khalid.$/ }));
    const sara = await screen.findByRole('menu');
    const checkOut = await within(sara).findByRole('menuitem', { name: 'Check out' });
    expect(within(sara).getAllByRole('menuitem')[0]).toBe(checkOut);
    expect(within(sara).queryByRole('menuitem', { name: 'Check in' })).toBeNull();
    expect(within(sara).queryByRole('menuitem', { name: /Receive/ })).toBeNull();
    await user.click(checkOut);
    await waitFor(() => {
      expect(requests.map((request) => request.url)).toContain(
        '/manage/spaces/7/check-ins/3/check-out',
      );
    });

    await user.click(screen.getByRole('button', { name: /^More actions: .Omar.$/ }));
    const omar = await screen.findByRole('menu');
    const receive = await within(omar).findByRole('menuitem', { name: heard('Receive ₪15') });
    expect(within(omar).getAllByRole('menuitem')[0]).toBe(checkIn(omar));
    await user.click(receive);
    const dialog = await screen.findByRole('dialog');
    expect(plain(descriptionOf(dialog))).toMatch(/^Oldest item: Visit of /);
  });

  it('moves nothing under the pointer: while the file reads, one held busy item, then every item in place', async () => {
    const user = userEvent.setup();
    const answer = deferred<FakeAnswer>();
    fakeTransport((request) => {
      if (/\/customers\/4$/.test(request.url ?? '')) return answer.promise;
      return customersPage([customerRow({ id: 4, name: 'Sara Khalid' })]);
    });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <main>
            <CustomersList
              spaceId={7}
              owner
              fileLink={(id) => `/file/${String(id)}`}
              subscribe={() => undefined}
              add={() => undefined}
            />
          </main>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(await screen.findByRole('button', { name: /^More actions: .Sara Khalid.$/ }));
    const menu = await screen.findByRole('menu');
    // Nothing a tap could hit moves once the file answers: the state's place is held, alone.
    const [busy, ...rest] = within(menu).getAllByRole('menuitem');
    expect(rest).toEqual([]);
    expect(busy).toHaveAttribute('aria-disabled', 'true');
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(within(menu).queryByRole('menuitem', { name: 'Customer file' })).toBeNull();

    answer.resolve(ok(PRESENT));
    expect(await within(menu).findByRole('menuitem', { name: 'Check out' })).toBe(
      within(menu).getAllByRole('menuitem')[0],
    );
    expect(within(menu).getByRole('menuitem', { name: 'Customer file' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { busy: true })).toBeNull();
  });

  it('the file’s header holds the state’s buttons, the first primary, then «⋯»; axe-clean', async () => {
    const { container } = renderFile({ ...OWING, customer: { ...PRESENT.customer } });

    const buttons = await headerActions();
    expect(
      buttons.map((button) => plain(button.getAttribute('aria-label') ?? button.textContent)),
    ).toEqual(['Check in Sara Khalid', 'Receive ₪15', 'More actions: Sara Khalid']);
    expect(buttons[0]).toHaveClass('bg-primary');
    expect(buttons[1]).not.toHaveClass('bg-primary');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('names the oldest owing item across both kinds: an older subscription before a newer visit', async () => {
    const user = userEvent.setup();
    renderFile(
      customerFile({
        debtAgorot: 22000,
        subscriptions: [
          {
            ...subscriptionState({ id: 2, name: 'Monthly' }),
            paidAgorot: 10000,
            balanceAgorot: 20000,
            // Made on 1 September: the oldest debt, as the server takes them.
            createdAt: '2026-09-01T07:00:00.000Z',
          },
        ],
        unpaidVisits: [
          {
            visit: deskVisit({
              id: 3,
              checkedInAt: '2026-10-24T10:00:00.000Z',
              checkedOutAt: '2026-10-24T13:00:00.000Z',
              checkoutMethod: 'MANUAL',
              charge: {
                amountAgorot: 2000,
                roundingRule: null,
                roundingMinutes: null,
                capApplied: null,
                typedById: null,
                reason: null,
              },
            }),
            payments: [],
            paidAgorot: 0,
            balanceAgorot: 2000,
          },
        ],
      }),
    );

    const buttons = await headerActions();
    const receive = buttons.find((button) => plain(button.textContent).startsWith('Receive'));
    expect(plain(receive?.textContent ?? null)).toBe('Receive ₪200');
    await user.click(receive as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    expect(plain(descriptionOf(dialog))).toBe('Oldest item: Monthly');
  });

  it('offers «Renew» only while the subscription ends soon or has expired', async () => {
    const user = userEvent.setup();
    const active = renderFile(fileWith('ACTIVE'));
    await headerActions();
    expect(screen.queryByRole('button', { name: 'Renew' })).toBeNull();
    active.unmount();

    const ending = renderFile(fileWith('ENDING_SOON'));
    await headerActions();
    const renewals = screen.getAllByRole('button', { name: 'Renew' });
    // The header's and the latest card's.
    expect(renewals).toHaveLength(2);
    await user.click(renewals[0] as HTMLElement);
    const [entry, from] = ending.subscribe.mock.calls[0] ?? [];
    expect(entry).toMatchObject({ mode: 'renew', renews: { id: 1 } });
    expect(from).toBe(renewals[0]);
    ending.unmount();

    renderList({ 4: fileWith('EXPIRED'), 5: fileWith('ACTIVE') });
    await user.click(await screen.findByRole('button', { name: /^More actions: .Sara Khalid.$/ }));
    expect(
      await within(await screen.findByRole('menu')).findByRole('menuitem', { name: 'Renew' }),
    ).toBeVisible();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /^More actions: .Omar.$/ }));
    const omar = await screen.findByRole('menu');
    await within(omar).findByRole('menuitem', { name: 'Check in' });
    expect(within(omar).queryByRole('menuitem', { name: 'Renew' })).toBeNull();
  });
});

/** The menu's «Check in», which comes before what they owe. */
function checkIn(menu: HTMLElement) {
  return within(menu).getByRole('menuitem', { name: 'Check in' });
}

/** The text of the element a dialog is described by. */
function descriptionOf(dialog: HTMLElement) {
  const id = dialog.getAttribute('aria-describedby') ?? '';
  return document.getElementById(id)?.textContent ?? '';
}
