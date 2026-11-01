import type { AuditTarget } from '@masaha/shared/audit';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { auditEntry, auditPage } from '../../../test/auditEntry';
import { fakeTransport, refused, restoreTransport } from '../../../test/fakeTransport';
import { stubScreenWidth } from '../../../test/screenWidth';
import { startPreferences } from '../../../test/startPreferences';
import { AuditLog } from './AuditLog';

/** The owner's log of space 7, Focus Hub, at `/audit` with `search`; a customer links to its file. */
function renderLog(answer: Parameters<typeof fakeTransport>[0], search = '') {
  const requests = fakeTransport(answer);
  const linkOf = ({ type, id }: AuditTarget) =>
    type === 'customer' ? `/customers/${String(id)}` : null;
  const router = createMemoryRouter(
    [
      {
        path: '/audit',
        element: (
          <AuditLog scope="space" spaceId={7} spaceName={{ text: 'Focus Hub' }} linkOf={linkOf} />
        ),
      },
    ],
    { initialEntries: [`/audit${search}`] },
  );
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...view, router, requests };
}

const rowsOf = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    );

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
  restoreTransport();
});

describe('AuditLog (the owner’s)', () => {
  it('shows a table from 768 px: the time, the actor, the action, the target with its details; axe-clean', async () => {
    stubScreenWidth(1024);
    const { container, requests } = renderLog(() =>
      auditPage([
        auditEntry(),
        auditEntry({
          id: 502,
          action: 'customer.created',
          target: { type: 'customer', id: 31, name: 'Omar Nasser', nameAr: null, deleted: false },
          after: { name: 'Omar Nasser' },
        }),
      ]),
    );

    await screen.findByText('Events: 2');
    const table = screen.getByRole('table', { name: 'Audit log' });
    expect(
      screen.getByText('Everything done at ⁨Focus Hub⁩: who did what, and when.'),
    ).toBeInTheDocument();
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Time', 'Actor', 'Action', 'Target', 'Details']);
    expect(rowsOf(table)).toEqual([
      [
        '21 October 2026 · 12:05',
        'Huda Saleh',
        'Payment recorded',
        'A payment₪40 · Cash',
        '₪40 · Cash',
      ],
      ['21 October 2026 · 12:05', 'Huda Saleh', 'New customer', 'Omar Nasser', ''],
    ]);
    expect(within(table).getByRole('link', { name: 'Omar Nasser' })).toHaveAttribute(
      'href',
      '/customers/31',
    );
    expect(screen.getByText('Events: 2')).toBeInTheDocument();
    expect(requests[0]?.url).toBe('/manage/spaces/7/audit-log');
    expect(requests[0]?.params).toEqual({ period: 'LAST_30_DAYS', page: 1, limit: 20 });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('the owner’s log: Masaha as «فريق مساحة», the system as «النظام»', async () => {
    startPreferences('ar');
    stubScreenWidth(1024);
    renderLog(() =>
      auditPage([
        auditEntry({
          id: 1,
          actor: { kind: 'MASAHA' },
          action: 'space.hidden',
          target: { type: 'space', id: 7, name: 'Focus Hub', nameAr: 'فوكس هب', deleted: false },
        }),
        auditEntry({
          id: 2,
          actor: { kind: 'SYSTEM' },
          action: 'visit.autoCheckedOut',
          target: { type: 'visit', id: 4, name: null, nameAr: null, deleted: false },
          after: { chargeAgorot: null },
        }),
      ]),
    );

    await screen.findByText('الأحداث: 2');
    const table = screen.getByRole('table', { name: 'سجل التدقيق' });
    const [masaha, system] = rowsOf(table);
    expect(masaha?.slice(1, 4)).toEqual(['فريق مساحة', 'إخفاء مساحة', 'فوكس هب']);
    expect(system?.slice(1, 4)).toEqual(['النظام', 'خروج تلقائي', 'زيارة']);
  });

  it('the actor filter shows only with more than one actor', async () => {
    stubScreenWidth(1024);
    const user = userEvent.setup();
    const masaha = auditEntry({ id: 2, actor: { kind: 'MASAHA' } });
    const two = [auditEntry(), masaha];
    const { requests, router } = renderLog((config) =>
      (config.params as { actor?: unknown } | undefined)?.actor === 'MASAHA'
        ? auditPage([masaha], { actors: two.map((each) => each.actor) })
        : auditPage(two),
    );

    await screen.findByText('Events: 2');
    const actor = screen.getByRole('combobox', { name: 'Actor' });
    await user.click(actor);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'All',
      'Huda Saleh',
      'The Masaha team',
    ]);
    await user.click(screen.getByRole('option', { name: 'The Masaha team' }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?actor=masaha');
    });
    expect(requests.at(-1)?.params).toMatchObject({ actor: 'MASAHA' });
  });

  it('hides the actor filter for a period of one actor', async () => {
    stubScreenWidth(1024);
    renderLog(() => auditPage([auditEntry()]));

    await screen.findByText('Events: 1');
    expect(screen.getByRole('combobox', { name: 'Action type' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Actor' })).not.toBeInTheDocument();
  });

  it('a void, a staff deactivation, an extension and a photo removal are red; the rest neutral', async () => {
    stubScreenWidth(1024);
    const actions = [
      'payment.voided',
      'space.staffDeactivated',
      'closure.subscriptionsExtended',
      'space.photoRemoved',
      'payment.recorded',
      'space.deleted',
    ];
    renderLog(() =>
      auditPage(actions.map((action, index) => auditEntry({ id: index + 1, action, after: null }))),
    );

    await screen.findByText('Events: 6');
    const table = screen.getByRole('table', { name: 'Audit log' });
    const badges = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) =>
        within(row).getAllByRole('cell')[2]?.firstElementChild?.getAttribute('data-variant'),
      );
    expect(badges).toEqual([
      'destructive',
      'destructive',
      'destructive',
      'destructive',
      'neutral',
      'neutral',
    ]);
  });

  it('shows a card per entry below 768 px: the badge and the time, the target, the details, the actor', async () => {
    stubScreenWidth(390);
    renderLog(() => auditPage([auditEntry()]));

    await screen.findByText('Events: 1');
    const [card] = within(screen.getByRole('list', { name: 'Audit log' })).getAllByRole('listitem');
    expect(card?.textContent).toBe(
      'Payment recorded21 October 2026 · 12:05A payment₪40 · CashHuda Saleh',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
  });

  it('says no event yet, and no event matches the filters', async () => {
    stubScreenWidth(1024);
    const { unmount } = renderLog(() => auditPage([]));
    expect(await screen.findByText('No events yet')).toBeInTheDocument();
    unmount();

    renderLog(() => auditPage([]), '?type=payments');
    expect(await screen.findByText('No events match the filters')).toBeInTheDocument();
  });

  it('says a failed read, and tries again', async () => {
    stubScreenWidth(1024);
    const user = userEvent.setup();
    const { requests } = renderLog((_, index) =>
      index === 0 ? refused(403, { type: 'forbidden' }) : auditPage([auditEntry()]),
    );

    expect(await screen.findByText('Couldn’t load the audit log')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Events: 1');
    expect(requests).toHaveLength(2);
  });
});
