import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { myReport, reportsPage } from '../../../../test/dataReport';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { MyReportsList } from './MyReportsList';

/** A message of 161 characters: one past what is shown whole. */
const LONG = 'The price is old. '.repeat(8).padEnd(161, '!');

/** «بلاغاتي» at `/me/reports`, answered by `answer`. */
function renderList(answer: Parameters<typeof fakeTransport>[0]) {
  fakeTransport(answer);
  const router = createMemoryRouter(
    [
      {
        path: '/me/reports',
        element: <MyReportsList spaceLink={(slug) => `/spaces/${slug}`} browseLink="/spaces" />,
      },
    ],
    { initialEntries: ['/me/reports'] },
  );
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
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

describe('MyReportsList', () => {
  it('folds a long message to two lines with «Show more», a short one with none, each in its own direction; axe-clean', async () => {
    expect(Array.from(LONG)).toHaveLength(161);
    const { container } = renderList(() =>
      reportsPage([
        myReport({ id: 41, message: LONG }),
        myReport({
          id: 42,
          message: 'الساعات خاطئة',
          status: 'RESOLVED',
          decision: {
            status: 'RESOLVED',
            at: '2026-10-22T08:00:00.000Z',
            note: 'صحّحنا الساعات',
            repliedBy: 'SPACE',
          },
        }),
      ]),
    );

    const region = await screen.findByRole('region', { name: 'Reports' });
    const cards = await within(region).findAllByRole('listitem');
    expect(cards).toHaveLength(2);
    const [long, short] = cards as [HTMLElement, HTMLElement];

    const toggle = within(long).getByRole('button', { name: 'Show more' });
    const message = within(long).getByText(LONG);
    expect(message).toHaveAttribute('dir', 'auto');
    expect(message).toHaveClass('line-clamp-2');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', message.id);

    await userEvent.click(toggle);
    expect(within(long).getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(message).not.toHaveClass('line-clamp-2');

    expect(within(short).queryByRole('button')).not.toBeInTheDocument();
    expect(within(short).getByText('الساعات خاطئة')).toHaveAttribute('dir', 'auto');
    expect(within(short).getByText('Reply from the space')).toBeInTheDocument();
    expect(within(short).getByText('صحّحنا الساعات')).toHaveAttribute('dir', 'auto');
    expect(
      within(short).getByRole('heading', { level: 2, name: 'Masaha Hub' }),
    ).toBeInTheDocument();
    expect(within(short).getByRole('link', { name: 'Masaha Hub' })).toHaveAttribute(
      'href',
      '/spaces/masaha-hub',
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('names a space that left as text, with no link', async () => {
    renderList(() =>
      reportsPage([myReport({}, { nameEn: 'Old Hub', nameAr: null, listed: false })]),
    );

    const card = within(await screen.findByRole('listitem'));
    expect(card.getByRole('heading', { level: 2, name: 'Old Hub' })).toBeInTheDocument();
    expect(card.queryByRole('link')).not.toBeInTheDocument();
    expect(card.getByText('This space is no longer listed in the directory')).toBeInTheDocument();
  });

  it('offers «Browse spaces» when none is sent yet', async () => {
    renderList(() => reportsPage([]));

    expect(
      await screen.findByRole('heading', { name: 'You haven’t sent any reports yet' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse spaces' })).toHaveAttribute('href', '/spaces');
  });
});
