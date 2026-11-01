import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditEntry, auditPage } from '../../../../test/auditEntry';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { AuditPage } from './AuditPage';

beforeEach(() => {
  startPreferences('ar');
  stubScreenWidth(1280);
});

afterEach(() => {
  vi.unstubAllGlobals();
  restoreTransport();
});

describe('AuditPage (the owner’s)', () => {
  it('names the space from the user’s spaces and links each target to its page', async () => {
    const requests = fakeTransport((config) =>
      config.url === '/manage/spaces'
        ? ok([
            {
              spaceId: 7,
              role: 'OWNER',
              slug: 'focus-hub',
              nameEn: 'Focus Hub',
              nameAr: 'فوكس هب',
              area: { nameAr: 'الرمال', nameEn: 'Rimal' },
            },
          ])
        : auditPage([
            auditEntry({
              action: 'customer.edited',
              target: {
                type: 'customer',
                id: 31,
                name: 'Omar Nasser',
                nameAr: null,
                deleted: false,
              },
              after: null,
            }),
            auditEntry({
              id: 2,
              action: 'dataReport.resolved',
              target: { type: 'dataReport', id: 41, name: null, nameAr: null, deleted: false },
              after: null,
            }),
            auditEntry({ id: 3 }),
          ]),
    );
    const router = createMemoryRouter(
      [{ path: '/dashboard/spaces/:spaceId/audit', element: <AuditPage /> }],
      { initialEntries: ['/dashboard/spaces/7/audit'] },
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText('كل ما جرى في ⁨فوكس هب⁩: مَن فعل ماذا، ومتى.'),
    ).toBeInTheDocument();
    await screen.findByText('الأحداث: 3');
    const table = screen.getByRole('table', { name: 'سجل التدقيق' });
    expect(within(table).getByRole('link', { name: 'Omar Nasser' })).toHaveAttribute(
      'href',
      '/dashboard/spaces/7/customers/31',
    );
    expect(within(table).getByRole('link', { name: 'بلاغ' })).toHaveAttribute(
      'href',
      '/dashboard/spaces/7/reports?open=41',
    );
    expect(within(table).getByRole('link', { name: 'دفعة' })).toHaveAttribute(
      'href',
      '/dashboard/spaces/7/payments',
    );
    expect(requests.some((request) => request.url === '/manage/spaces/7/audit-log')).toBe(true);
  });
});
