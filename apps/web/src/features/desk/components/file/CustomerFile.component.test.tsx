import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { customerFile, subscriptionState, SUBSCRIBED_AT } from '../../../../test/deskCustomer';
import { deskVisit } from '../../../../test/deskVisit';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { CustomerFile } from './CustomerFile';

const FILE = customerFile({
  debtAgorot: 6500,
  subscriptions: [
    {
      ...subscriptionState({ id: 2, name: 'Two weeks', priceTyped: { byId: 14, reason: 'Deal' } }),
      paidAgorot: 10000,
      balanceAgorot: 5000,
      createdAt: SUBSCRIBED_AT,
    },
    {
      ...subscriptionState({ id: 1, name: 'Exams', status: 'EXPIRED' }),
      paidAgorot: 15000,
      balanceAgorot: 0,
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
      payments: [
        {
          id: 21,
          amountAgorot: 1000,
          method: 'CASH',
          note: null,
          receivedAt: '2026-10-24T15:00:00Z',
          recordedById: 15,
          recordedBy: { id: 15, name: 'Mona' },
          voided: null,
        },
        {
          id: 22,
          amountAgorot: 500,
          method: 'CASH',
          note: null,
          receivedAt: '2026-10-24T15:05:00Z',
          recordedById: 15,
          recordedBy: { id: 15, name: 'Mona' },
          voided: { at: '2026-10-24T16:00:00Z', by: { id: 14, name: 'Ahmad' }, reason: 'Twice' },
        },
      ],
      paidAgorot: 1000,
      balanceAgorot: 1500,
    },
  ],
});

beforeEach(() => {
  startPreferences('en');
  stubScreenWidth(1440);
});

afterEach(() => {
  restoreTransport();
});

describe('CustomerFile', () => {
  it('heads its sections h2 and its cards h3, under the page’s h1; axe-clean', async () => {
    fakeTransport(() => ok(FILE));
    const { container } = render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <main>
            <h1>Sara Khalid</h1>
            <CustomerFile
              spaceId={7}
              customerId={4}
              owner
              subscribe={() => undefined}
              spaceName={{ nameAr: null, nameEn: 'S' }}
            />
          </main>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const subscriptions = await screen.findByRole('heading', { level: 2, name: 'Subscriptions' });
    expect(screen.getByRole('heading', { level: 2, name: 'Unpaid visits' })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(['Two weeks', 'Exams']);
    const region = screen.getByRole('region', { name: 'Subscriptions' });
    expect(region).toContainElement(subscriptions);
    expect(within(region).getByText('Typed price')).toBeVisible();
    expect(within(region).getAllByRole('button', { name: 'Receive what’s left' })).toHaveLength(1);
    // Each payment on an unpaid visit names who recorded it, and a void who voided it (finding 162).
    const unpaid = screen.getByRole('region', { name: 'Unpaid visits' });
    expect(within(unpaid).getAllByText(/Recorded by .Mona.$/)).toHaveLength(2);
    expect(within(unpaid).getByText(/^Voided by .Ahmad.: Twice$/)).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('the file’s reminder link holds the filled template, with its caption', async () => {
    fakeTransport(() =>
      ok({ ...FILE, reminderTemplate: 'Hi {الاسم}, you owe {المبلغ} at {المساحة}.' }),
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <main>
            <CustomerFile
              spaceId={7}
              customerId={4}
              owner
              subscribe={() => undefined}
              spaceName={{ nameAr: 'مساحة واحد', nameEn: 'Masaha One' }}
            />
          </main>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // The space's own words name it as the space does, by its Arabic name first.
    const link = await screen.findByRole('link', { name: 'WhatsApp reminder' });
    expect(link).toHaveAttribute(
      'href',
      `https://wa.me/970599000201?text=${encodeURIComponent('Hi Sara, you owe ₪65 at مساحة واحد.')}`,
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
    expect(screen.getByText('Opens WhatsApp with a ready message; you send it.')).toBeVisible();
  });

  it('offers no reminder with no phone or nothing owed; the default text with no template', async () => {
    fakeTransport(() => ok({ ...FILE, customer: { ...FILE.customer, phone: null } }));
    const first = render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <CustomerFile
            spaceId={7}
            customerId={4}
            owner
            subscribe={() => undefined}
            spaceName={{ nameAr: null, nameEn: 'S' }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByRole('heading', { level: 2, name: 'Subscriptions' });
    expect(screen.queryByRole('link', { name: 'WhatsApp reminder' })).toBeNull();
    first.unmount();

    fakeTransport(() => ok({ ...FILE, debtAgorot: 0 }));
    const second = render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <CustomerFile
            spaceId={7}
            customerId={4}
            owner
            subscribe={() => undefined}
            spaceName={{ nameAr: null, nameEn: 'S' }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByRole('heading', { level: 2, name: 'Subscriptions' });
    expect(screen.queryByRole('link', { name: 'WhatsApp reminder' })).toBeNull();
    second.unmount();

    fakeTransport(() => ok(FILE));
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <CustomerFile
            spaceId={7}
            customerId={4}
            owner
            subscribe={() => undefined}
            spaceName={{ nameAr: 'مساحة واحد', nameEn: 'S' }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    // The catalogue's English text names the space in English: the message is one language.
    const link = await screen.findByRole('link', { name: 'WhatsApp reminder' });
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain(
      'Hello Sara, a reminder from S: you owe ₪65.',
    );
  });

  it('offers the owner «Write off…» on an unpaid visit, reception none; says they count in the balance', async () => {
    const user = userEvent.setup();
    fakeTransport(() => ok(FILE));
    const owner = render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <CustomerFile
            spaceId={7}
            customerId={4}
            owner
            subscribe={() => undefined}
            spaceName={{ nameAr: null, nameEn: 'S' }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const unpaid = await screen.findByRole('region', { name: 'Unpaid visits' });
    expect(within(unpaid).getByText('They count in their balance.')).toBeVisible();
    await user.click(
      within(unpaid).getByRole('button', { name: /^More actions for .Sara Khalid/ }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Write off…' }));
    expect(await screen.findByRole('alertdialog')).toBeVisible();
    owner.unmount();

    fakeTransport(() => ok(FILE));
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <CustomerFile
            spaceId={7}
            customerId={4}
            owner={false}
            subscribe={() => undefined}
            spaceName={{ nameAr: null, nameEn: 'S' }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const theirs = await screen.findByRole('region', { name: 'Unpaid visits' });
    expect(within(theirs).queryByRole('button', { name: /^More actions for/ })).toBeNull();
  });

  it('says «Here since {time}», info, while present; «only visits» with its icon only with no unpaid visit', async () => {
    fakeTransport(() =>
      ok({
        ...FILE,
        present: { kind: 'VISIT', id: 9, since: '2026-10-25T07:00:00.000Z' },
        subscriptions: [],
      }),
    );
    const first = render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <CustomerFile
            spaceId={7}
            customerId={4}
            owner
            subscribe={() => undefined}
            spaceName={{ nameAr: null, nameEn: 'S' }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const here = await screen.findByText(/^Here since .09:00.$/);
    expect(here).toHaveAttribute('data-variant', 'info');
    // It has unpaid visits: it does not come for visits alone, as far as the file says.
    expect(screen.queryByText('This customer only comes for visits.')).toBeNull();
    first.unmount();

    fakeTransport(() => ok(customerFile({ subscriptions: [] })));
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <CustomerFile
            spaceId={7}
            customerId={4}
            owner
            subscribe={() => undefined}
            spaceName={{ nameAr: null, nameEn: 'S' }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const only = await screen.findByText('This customer only comes for visits.');
    expect(only.closest('[data-slot="empty-state"]')?.querySelector('svg')).not.toBeNull();
  });
});
