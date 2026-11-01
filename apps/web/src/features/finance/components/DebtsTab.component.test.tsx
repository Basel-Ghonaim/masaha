import type { BalanceRow, DebtsMeta, Payer } from '@masaha/shared/finance';
import { createQueryClient } from '@shared/api';
import { Toaster } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { findToast } from '../../../test/findToast';
import { fakeTransport, refused, restoreTransport } from '../../../test/fakeTransport';
import { stubScreenWidth } from '../../../test/screenWidth';
import { startPreferences } from '../../../test/startPreferences';
import type { FinanceLinks } from '../types/FinanceLinks';
import { FinanceExport } from './FinanceExport';
import { FinanceScreen } from './FinanceScreen';

const LINKS: FinanceLinks = {
  customer: (id) => `/customers/${String(id)}`,
  uncollected: '/desk#uncollected',
  ledger: ({ from, to }) => `/payments?from=${from}&to=${to}`,
};

const debtor = (id: number, fields: Partial<BalanceRow['customer']> = {}): BalanceRow => ({
  customer: {
    id,
    name: `Sara Odeh ${String(id)}`,
    phone: '+970599000001',
    archived: false,
    ...fields,
  },
  amountAgorot: 4500,
  oldestItem: { kind: 'VISIT', id: 90 + id, name: null, since: '2026-09-03' },
});

function meta(page: number, totalPages: number, totalRecords = totalPages * 50): DebtsMeta {
  return {
    currentPage: page,
    limit: 50,
    totalRecords,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    totals: {
      owed: { agorot: 120_000, customers: 14 },
      credit: { agorot: 30_000, customers: 3 },
      uncollected: { visits: 5, owedAgorot: 7_500, unpriced: 2 },
    },
    reminderTemplate: 'Hi {الاسم}, you owe {المبلغ} at {المساحة}.',
  };
}

const payer = (id: number): Payer => ({
  customer: { id, name: `Payer ${String(id)}` },
  paidAgorot: 2_000,
  lastPaidAt: '2026-10-20T09:00:00.000Z',
});

const page = (data: unknown[], pageMeta: unknown): FakeAnswer => ({
  status: 200,
  data: { success: true, data, meta: pageMeta },
});

/** A request's query parameters, as the transport sent them. */
const paramsOf = (request: { params?: unknown }) =>
  (request.params ?? {}) as Record<string, unknown>;

/** The server: two debtors (one archived, one with no phone), one in credit, seven payers. */
function server(request: { url?: string; params?: unknown }): FakeAnswer {
  if (request.url?.endsWith('/payers') === true) {
    return page([payer(1), payer(2), payer(3), payer(4), payer(5)], {
      ...meta(1, 2, 7),
      limit: 5,
    });
  }
  if (paramsOf(request).state === 'CREDIT') return page([debtor(30)], meta(1, 1, 1));
  return page([debtor(1, { archived: true }), debtor(2, { phone: null })], meta(1, 1, 2));
}

function renderDebts(answer: Parameters<typeof fakeTransport>[0], path = '/finance?tab=debts') {
  const requests = fakeTransport(answer);
  const router = createMemoryRouter(
    [
      {
        path: '/finance',
        element: (
          <main>
            <h1>Finance</h1>
            <FinanceExport spaceId={7} />
            <FinanceScreen
              spaceId={7}
              spaceName={{ nameAr: 'مساحة فوكس', nameEn: 'Focus Hub' }}
              links={LINKS}
            />
          </main>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
      <Toaster label="Notifications" closeLabel="Close notification" />
    </QueryClientProvider>,
  );
  return { ...view, requests };
}

/** Text with the isolates around its values removed, as a reader hears it. */
const heard = (element: Element) => element.textContent.replace(/[⁦-⁩]/g, '');

/** The links `saved` collects as the browser would save them. */
function catchSaves() {
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:masaha/1');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  const saved: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    saved.push(this.download);
  });
  return saved;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-29T10:00:00.000Z'));
  startPreferences('en');
  stubScreenWidth(1280);
});

afterEach(() => {
  restoreTransport();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Finance › Debts', () => {
  it('shows the four tiles, the uncollected one linking to the desk and never added; axe-clean', async () => {
    const { container } = renderDebts(server);

    await screen.findByRole('region', { name: 'Customers who owe' });
    const tiles = [...container.querySelectorAll('[data-slot="stat-card"]')].map(heard);
    expect(tiles).toEqual([
      'Total owed₪1,20014 customers',
      'Customer credit₪3003 customers paid in advance',
      'Paid in October 20267 customers',
      'Uncollected visits5 visits₪75 · never added to the debts · 2 with no price',
    ]);
    expect(screen.getByRole('link', { name: /Uncollected visits/ })).toHaveAttribute(
      'href',
      '/desk#uncollected',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps the counted tiles in Arabic’s own direction, only the amounts left to right', async () => {
    startPreferences('ar');
    const { container } = renderDebts(server);

    await screen.findByRole('region', { name: 'عليهم مبالغ' });
    const values = [...container.querySelectorAll('[data-slot="stat-card"] dd:first-of-type')];
    // An amount keeps its order in an ltr box; «7 زبائن» and «5 زيارات» read in the page's own.
    expect(values.map((value) => value.querySelector('[dir="ltr"]') !== null)).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(heard(values[2] as Element)).toBe('7 زبائن');
    expect(heard(values[3] as Element)).toBe('5 زيارات');
  });

  it('shows a debtor’s since, oldest item and amount, and WhatsApp only with a phone', async () => {
    renderDebts(server);

    const card = await screen.findByRole('region', { name: 'Customers who owe' });
    const [archived, noPhone] = within(card).getAllByRole('listitem') as [HTMLElement, HTMLElement];
    expect(heard(archived)).toBe(
      'Sara Odeh 1ArchivedSince 3 September 2026 · oldest item: VisitOwes ₪45WhatsApp reminderReceive payment',
    );
    expect(within(archived).getByRole('link', { name: 'WhatsApp reminder' })).toHaveAttribute(
      'href',
      // The space's own words name it by its Arabic name first.
      `https://wa.me/970599000001?text=${encodeURIComponent('Hi Sara, you owe ₪45 at مساحة فوكس.')}`,
    );
    expect(within(archived).getByRole('link', { name: 'Receive payment' })).toHaveAttribute(
      'href',
      '/customers/1',
    );
    expect(within(noPhone).queryByRole('link', { name: 'WhatsApp reminder' })).toBeNull();
  });

  it('names the space in English in the English default reminder: one language a message', async () => {
    renderDebts((request) => {
      const answer = server(request);
      if (request.url?.endsWith('/payers') === true || !('data' in answer)) return answer;
      const body = answer.data as { meta: DebtsMeta };
      return { ...answer, data: { ...body, meta: { ...body.meta, reminderTemplate: null } } };
    });

    const card = await screen.findByRole('region', { name: 'Customers who owe' });
    const [first] = within(card).getAllByRole('link', { name: 'WhatsApp reminder' });
    expect(decodeURIComponent(first?.getAttribute('href') ?? '')).toContain(
      'Hello Sara, a reminder from Focus Hub: you owe ₪45.',
    );
  });

  it('lists five who paid in the month, «View all» to the ledger’s range of that month', async () => {
    renderDebts(server);

    const card = await screen.findByRole('region', { name: 'Paid in October 2026' });
    expect(within(card).getAllByRole('listitem')).toHaveLength(5);
    expect(within(card).getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/payments?from=2026-10-01&to=2026-10-29',
    );
  });

  it('reads every page of who owes before saving the debts’ CSV', async () => {
    const saved = catchSaves();
    const { requests } = renderDebts((request) =>
      paramsOf(request).limit === 50
        ? page([debtor(Number(paramsOf(request).page))], meta(Number(paramsOf(request).page), 3))
        : server(request),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await screen.findByRole('region', { name: 'Customers who owe' });
    await user.click(screen.getByRole('button', { name: 'Export debts (CSV)' }));

    expect(await findToast('File downloaded')).toBeInTheDocument();
    expect(saved).toEqual(['masaha-debts-2026-10-29.csv']);
    expect(
      requests.filter((request) => paramsOf(request).limit === 50).map((r) => paramsOf(r).page),
    ).toEqual([1, 2, 3]);
  });

  it('saves nothing when a page of the export fails, and offers a retry', async () => {
    const saved = catchSaves();
    renderDebts((request) => {
      if (paramsOf(request).limit !== 50) return server(request);
      return paramsOf(request).page === 2
        ? refused(403, { type: 'forbidden' })
        : page([debtor(1)], meta(1, 3));
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await screen.findByRole('region', { name: 'Customers who owe' });
    await user.click(screen.getByRole('button', { name: 'Export debts (CSV)' }));

    const toast = await findToast('Couldn’t export the debts');
    expect(saved).toEqual([]);
    expect(
      within(toast.closest('li') ?? toast).getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
  });
});
