import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { adminReport, spaceReport } from '../../../../test/dataReport';
import { bodyOf, fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useReportNotice, type ReportNoticeScope } from '../../hooks/notice/useReportNotice';
import { ReportNotice } from './ReportNotice';

/** A page that shows the notice of report `reportId` for `scope`, and the section it sits inside. */
function Page({ scope, reportId }: { scope: ReportNoticeScope; reportId: number }) {
  const notice = useReportNotice(scope, reportId);
  return notice === null ? (
    <p>No notice</p>
  ) : (
    <section aria-label={`Inside ${notice.section}`}>
      <ReportNotice view={notice} />
    </section>
  );
}

const OWNER: ReportNoticeScope = { audience: 'owner', spaceId: 7, reportsPath: '/reports' };
const ADMIN: ReportNoticeScope = { audience: 'admin', spaceId: 7, reportsPath: '/reports' };

/** The page at `/space`, the server answering every request with `answer`. */
function renderNotice(
  scope: ReportNoticeScope,
  answer: Parameters<typeof fakeTransport>[0],
  reportId = 41,
  entry = '/space',
) {
  const requests = fakeTransport(answer);
  const router = createMemoryRouter(
    [{ path: '/space', element: <Page scope={scope} reportId={reportId} /> }],
    { initialEntries: [entry] },
  );
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...view, requests };
}

beforeEach(() => {
  startPreferences('en');
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-28T09:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
});

describe('ReportNotice', () => {
  it('reads the report by its id and sits inside its field’s section, its words quoted; axe-clean', async () => {
    const { container, requests } = renderNotice(OWNER, () => ok(spaceReport()));

    const inside = await screen.findByRole('region', { name: 'Inside hours' });
    expect(requests.map(({ url }) => url)).toEqual(['/manage/spaces/7/data-reports/41']);
    expect(inside.querySelector('#report')).toHaveTextContent('An open report on Opening hours');
    expect(screen.getByRole('link', { name: 'Open the report to reply' })).toHaveAttribute(
      'href',
      '/reports?open=41',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('lands on itself once it draws when the address’s hash is #report, after the page drew', async () => {
    // The page (the editor, cached) drew first; the notice draws only once its own read answers.
    renderNotice(OWNER, () => ok(spaceReport({ field: 'OTHER' })), 41, '/space?report=41#report');

    const notice = await waitFor(() => {
      const found = document.getElementById('report');
      expect(found).not.toBeNull();
      return found as HTMLElement;
    });
    await waitFor(() => {
      expect(notice).toHaveFocus();
    });
  });

  it('takes no focus when the address’s hash names something else', async () => {
    renderNotice(OWNER, () => ok(spaceReport()), 41, '/space?report=41#hours');

    await screen.findByRole('region', { name: 'Inside hours' });
    expect(document.getElementById('report')).not.toHaveFocus();
  });

  it('the owner’s notice says «زائر», the admin’s the name', async () => {
    startPreferences('ar');
    const owner = renderNotice(OWNER, () => ok(spaceReport()));
    expect(
      await screen.findByText('“The space opens at 9, not 8.” — زائر، 21 أكتوبر'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Huda Saleh/)).not.toBeInTheDocument();
    owner.unmount();

    renderNotice(ADMIN, () => ok(adminReport()));
    expect(
      await screen.findByText('“The space opens at 9, not 8.” — Huda Saleh، 21 أكتوبر'),
    ).toBeInTheDocument();
  });

  it('«تم التصحيح» resolves it in place', async () => {
    let decided = false;
    const { requests } = renderNotice(OWNER, (request) => {
      if (request.method === 'patch') {
        decided = true;
        return ok(spaceReport({ status: 'RESOLVED' }));
      }
      return ok(spaceReport(decided ? { status: 'RESOLVED' } : {}));
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Corrected' }));

    expect(await screen.findByText('Marked «Corrected»')).toBeInTheDocument();
    const patch = requests.find(({ method }) => method === 'patch');
    expect(patch?.url).toBe('/manage/spaces/7/data-reports/41');
    expect(bodyOf(patch)).toEqual({ status: 'RESOLVED' });
    expect(screen.getByRole('link', { name: 'Back to the reports' })).toHaveAttribute(
      'href',
      '/reports',
    );
    // Read again, decided now, the notice still says what was done here.
    await waitFor(() => {
      expect(requests.filter(({ method }) => method === 'get')).toHaveLength(2);
    });
    expect(screen.getByText('Marked «Corrected»')).toBeInTheDocument();
  });

  it('draws nothing for a report decided already, not found, of another space, or a verified space’s for the admin', async () => {
    const cases: [ReportNoticeScope, Parameters<typeof fakeTransport>[0]][] = [
      [OWNER, () => ok(spaceReport({ status: 'DISMISSED' }))],
      [OWNER, () => ({ status: 404, data: { success: false, error: { type: 'not_found' } } })],
      [ADMIN, () => ok(adminReport({ space: { ...adminReport().space, id: 8 } }))],
      [ADMIN, () => ok(adminReport({ space: { ...adminReport().space, verified: true } }))],
    ];
    for (const [scope, answer] of cases) {
      const { requests, unmount } = renderNotice(scope, answer);
      await waitFor(() => {
        expect(requests).toHaveLength(1);
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByText('No notice')).toBeInTheDocument();
      unmount();
    }
  });
});
