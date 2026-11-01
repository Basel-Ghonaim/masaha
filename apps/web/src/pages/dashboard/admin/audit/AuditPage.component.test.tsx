import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { auditPage, platformEntry } from '../../../../test/auditEntry';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { AuditPage } from './AuditPage';

/** The admin's audit page at `/dashboard/admin/audit` with `search`. */
function renderPage(answer: Parameters<typeof fakeTransport>[0], search = '') {
  const requests = fakeTransport(answer);
  const router = createMemoryRouter([{ path: '/dashboard/admin/audit', element: <AuditPage /> }], {
    initialEntries: [`/dashboard/admin/audit${search}`],
  });
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...view, router, requests };
}

const FOCUS_HUB = { id: 7, nameEn: 'Focus Hub', nameAr: 'فوكس هب', deleted: false };

beforeEach(() => {
  startPreferences('en');
  stubScreenWidth(1280);
});

afterEach(() => {
  vi.unstubAllGlobals();
  restoreTransport();
});

describe('AuditPage (the admin’s)', () => {
  it('the admin’s log names the entry’s space under the target; axe-clean', async () => {
    const { container, requests } = renderPage(() =>
      auditPage([
        platformEntry({
          action: 'space.ownerLinked',
          target: { type: 'user', id: 12, name: 'Sara Odeh', nameAr: null, deleted: false },
          space: FOCUS_HUB,
          after: null,
        }),
        platformEntry({
          id: 2,
          action: 'space.hidden',
          target: { type: 'space', id: 7, name: 'Focus Hub', nameAr: 'فوكس هب', deleted: false },
          space: FOCUS_HUB,
          after: null,
        }),
      ]),
    );

    await screen.findByText('Events: 2');
    expect(
      screen.getByText(
        'Platform events only. Space operations events (customers and payments) are seen only by the space owner.',
      ),
    ).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Audit log' });
    const [, person, space] = within(table).getAllByRole('row');
    const target = within(person as HTMLElement).getAllByRole('cell')[3] as HTMLElement;
    expect(target.textContent).toBe('Sara Odehat ⁨Focus Hub⁩');
    expect(within(target).getByRole('link', { name: 'Sara Odeh' })).toHaveAttribute(
      'href',
      '/dashboard/admin/users?q=Sara%20Odeh',
    );
    // The space itself is not named again under its own name.
    expect(within(space as HTMLElement).getAllByRole('cell')[3]?.textContent).toBe('Focus Hub');
    expect(within(table).getByRole('link', { name: 'Focus Hub' })).toHaveAttribute(
      'href',
      '/dashboard/admin/spaces/7',
    );
    expect(requests[0]?.url).toBe('/admin/audit-log');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('a deleted target is marked and not a link', async () => {
    renderPage(() =>
      auditPage([
        platformEntry({
          action: 'space.deleted',
          target: { type: 'space', id: 7, name: 'Focus Hub', nameAr: 'فوكس هب', deleted: true },
          space: { ...FOCUS_HUB, deleted: true },
          after: null,
        }),
      ]),
    );

    await screen.findByText('Events: 1');
    const table = screen.getByRole('table', { name: 'Audit log' });
    expect(within(table).getByText('Focus Hub (deleted)')).toBeInTheDocument();
    expect(within(table).queryByRole('link')).not.toBeInTheDocument();
    expect(within(table).getByText('Space deleted').getAttribute('data-variant')).toBe(
      'destructive',
    );
  });

  it('the filters are in the address and survive a reload', async () => {
    const user = userEvent.setup();
    const entries = [
      platformEntry(),
      platformEntry({ id: 2, actor: { kind: 'PERSON', id: 3, name: 'Admin Two' } }),
    ];
    const first = renderPage(() => auditPage(entries));

    await screen.findByText('Events: 2');
    await user.click(screen.getByRole('combobox', { name: 'Period' }));
    await user.click(screen.getByRole('option', { name: 'All time' }));
    await user.click(screen.getByRole('combobox', { name: 'Action type' }));
    await user.click(screen.getByRole('option', { name: 'Lookups' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search the target' }), 'Rimal');
    await waitFor(() => {
      expect(first.router.state.location.search).toBe('?q=Rimal&period=all&type=lookups');
    });
    const address = first.router.state.location.search;
    first.unmount();
    restoreTransport();

    // A reload: a new page at the same address reads the same filters.
    const { requests } = renderPage(() => auditPage(entries), address);
    await screen.findByText('Events: 2');
    expect(screen.getByRole('searchbox', { name: 'Search the target' })).toHaveValue('Rimal');
    expect(screen.getByRole('combobox', { name: 'Period' })).toHaveTextContent('All time');
    expect(screen.getByRole('combobox', { name: 'Action type' })).toHaveTextContent('Lookups');
    expect(requests[0]?.params).toMatchObject({
      period: 'ALL',
      q: 'Rimal',
      actions: expect.stringContaining('governorate.added') as string,
    });
  });
});
