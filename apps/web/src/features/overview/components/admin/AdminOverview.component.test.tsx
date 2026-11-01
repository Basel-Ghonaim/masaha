import type { AdminOverview as Overview } from '@masaha/shared/overview';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import type { AdminOverviewLinks } from '../../types/AdminOverviewLinks';
import { AdminOverview } from './AdminOverview';

const LINKS: AdminOverviewLinks = {
  spaces: '/spaces',
  reportsOpen: '/reports?status=open',
  stale: '/spaces?stale=true',
  unverified: '/spaces?status=unverified',
  users: '/users',
  space: (id) => `/spaces/${String(id)}`,
  completenessAll: '/spaces?status=editable&stale=true',
};

const space = (id: number, fields: Partial<Overview['completeness']['first'][number]> = {}) => ({
  id,
  nameEn: `Space ${String(id)}`,
  nameAr: null,
  hidden: false,
  missing: [],
  stale: [],
  ...fields,
});

function anOverview(fields: Partial<Overview> = {}): Overview {
  return {
    spaces: { verified: 10, unverified: 4, hidden: 2, unverifiedNoOwner: 4, staleOrMissing: 7 },
    reports: { open: 5, awaitingAdmin: 3, awaitingOwners: 2 },
    newUsers: 12,
    completeness: {
      total: 9,
      first: [
        space(1, { missing: ['hours'], stale: [{ group: 'prices', days: 40 }], hidden: true }),
        space(2, { missing: ['contacts'] }),
        space(3, { stale: [{ group: 'amenities', days: 2 }] }),
        space(4, { missing: ['profile'] }),
        space(5, { missing: ['prices'] }),
        space(6, { missing: ['hours'] }),
      ],
    },
    at: '2026-10-29T10:00:00.000Z',
    ...fields,
  };
}

function renderOverview(answer: Overview) {
  startPreferences('en');
  const requests = fakeTransport(() => ok(answer));
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <main>
          <h1>Overview</h1>
          <AdminOverview links={LINKS} />
        </main>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, requests };
}

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('AdminOverview', () => {
  it('shows the five tiles, each a link with its helper; axe-clean', async () => {
    const { container, requests } = renderOverview(anOverview());

    const summary = await screen.findByRole('region', { name: 'Platform summary' });
    expect(requests[0]?.url).toBe('/admin/overview');
    const tiles = within(summary)
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')]);
    expect(tiles).toEqual([
      ['Spaces1610 verified · 4 unverified · 2 hidden', '/spaces'],
      ['Open data reports53 waiting for the admin · 2 waiting for owners', '/reports?status=open'],
      [
        'Stale or missing data7By the platform’s freshness limits, or not added yet',
        '/spaces?stale=true',
      ],
      [
        'Unverified spaces, no owner4The admin edits them until an owner is linked',
        '/spaces?status=unverified',
      ],
      ['New users12Last 30 days', '/users'],
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('lists five spaces to complete, missing as a warning, and «View all (n)» to editable&stale', async () => {
    renderOverview(anOverview());

    const card = await screen.findByRole('region', { name: 'Data completeness' });
    const rows = within(card).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    const [first] = rows as [HTMLElement];
    expect(within(first).getByText('Hidden')).toBeInTheDocument();
    expect(within(first).getByText('Unverified')).toBeInTheDocument();
    const missing = within(first).getByText('Opening hours · not added yet');
    expect(missing).toHaveAttribute('data-variant', 'warning');
    expect(within(first).getByText('Prices · 40 days')).toHaveAttribute('data-variant', 'warning');
    expect(within(first).getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/spaces/1');
    expect(within(card).getByRole('link', { name: 'View all (9)' })).toHaveAttribute(
      'href',
      '/spaces?status=editable&stale=true',
    );
  });

  it('says «View all» without a total at five or fewer, and none when nothing is missing', async () => {
    renderOverview(anOverview({ completeness: { total: 0, first: [] } }));

    const card = await screen.findByRole('region', { name: 'Data completeness' });
    expect(within(card).getByText('No space misses anything.')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'View all' })).toBeInTheDocument();
  });

  it('shows the privacy note', async () => {
    renderOverview(anOverview());

    expect(
      await screen.findByText(
        'A space’s operating data is private to its management — customers, visits, subscriptions, payments and finance.',
      ),
    ).toBeInTheDocument();
  });
});
