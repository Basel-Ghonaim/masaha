import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { publicSpace } from '../../../../test/publicSpace';
import { queryWrapper } from '../../../../test/queryWrapper';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { nearMeStore } from '../../hooks/near/nearMeStore';
import { SpaceDetails } from './SpaceDetails';

const NOW = new Date('2026-10-22T10:00:00Z');

/** The page's details at `width`, the server answering with `space`. */
function renderDetails(width: number, space = publicSpace(), ownerContact = <p>البريد</p>) {
  stubScreenWidth(width);
  fakeTransport(() => ok(space));
  const router = createMemoryRouter(
    [
      {
        path: '/spaces/:slug',
        element: (
          <main>
            <SpaceDetails
              slug="noor-hub"
              areaName={() => 'الرمال · غزة'}
              browseLink="/spaces"
              ownerContact={ownerContact}
            />
          </main>
        ),
      },
    ],
    { initialEntries: ['/spaces/noor-hub'] },
  );
  const Wrapper = queryWrapper();
  return render(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  );
}

/** The page's sections' names, in the page's order. */
const sectionNames = () =>
  screen
    .getAllByRole('region')
    .filter((region) => region.tagName === 'SECTION')
    .map((region) => region.getAttribute('aria-labelledby'))
    .map((id) => document.getElementById(id ?? '')?.textContent);

beforeEach(() => {
  startPreferences('ar');
  nearMeStore.clear();
  vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
});

afterEach(() => {
  restoreTransport();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('SpaceDetails', () => {
  it.each([390, 1440])(
    'one h1; the sections in U8’s order, each named by its heading; axe-clean at %i',
    async (width) => {
      const { container } = renderDetails(width);

      expect(await screen.findByRole('heading', { level: 1, name: 'نور هب' })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(sectionNames()).toEqual([
        'الأسعار',
        'ساعات العمل',
        'المرافق',
        'عن المساحة',
        'الموقع',
        ...(width < 1024 ? ['التواصل'] : []),
      ]);
      await screen.findByRole('img', { name: 'موقع نور هب على الخريطة' });
      expect(await axe(container)).toHaveNoViolations();
    },
  );

  it('from 1024 px the status and the contacts are a named aside; below it a status card first and a contact section last; the bar only below 768 px', async () => {
    const wide = renderDetails(1440);
    const aside = await screen.findByRole('complementary', { name: 'الحالة والتواصل' });
    expect(within(aside).getByRole('link', { name: /اتصال — جوال/ })).toHaveAttribute(
      'href',
      'tel:+970599111002',
    );
    expect(screen.queryByRole('region', { name: 'التواصل السريع' })).not.toBeInTheDocument();
    wide.unmount();

    const tablet = renderDetails(800);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'الحالة' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'التواصل السريع' })).not.toBeInTheDocument();
    tablet.unmount();

    renderDetails(390);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    const status = screen.getByRole('heading', { level: 2, name: 'الحالة' });
    const prices = screen.getByRole('heading', { level: 2, name: 'الأسعار' });
    expect(status.compareDocumentPosition(prices) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(sectionNames().at(-1)).toBe('التواصل');
    const bar = screen.getByRole('region', { name: 'التواصل السريع' });
    expect(within(bar).getByRole('link', { name: 'واتساب' })).toHaveAttribute(
      'href',
      'https://wa.me/970599111001',
    );
    expect(within(bar).getByRole('link', { name: 'اتصال' })).toHaveAttribute(
      'href',
      'tel:+970599111002',
    );
  });

  it('the owner’s dialog shows the page’s contact, or its `none` line', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderDetails(1440, publicSpace({ isVerified: false }), <p>لا توجد وسيلة تواصل متاحة الآن.</p>);

    const notice = await screen.findByText(/جمع فريقنا هذه المعلومات/);
    expect(notice).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'هل تدير هذه المساحة؟ تواصل معنا' }));

    const dialog = await screen.findByRole('dialog', { name: 'تواصل مع فريقنا' });
    expect(within(dialog).getByText('لا توجد وسيلة تواصل متاحة الآن.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'إغلاق' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('the hours mark today and list every day on demand', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderDetails(
      1440,
      publicSpace({
        hours: {
          days: [
            { opensMinute: 480, closesMinute: 1320 },
            { opensMinute: 480, closesMinute: 1320 },
            { opensMinute: 600, closesMinute: 1200 },
            { opensMinute: 600, closesMinute: 1200 },
            { opensMinute: 600, closesMinute: 1200 },
            null,
            { opensMinute: 0, closesMinute: 1440 },
          ],
          shifts: [],
        },
      }),
    );

    const table = await screen.findByRole('table', { name: 'ساعات العمل الأسبوعية' });
    expect(within(table).getAllByRole('row')).toHaveLength(5);
    const today = table.querySelector('[aria-current="date"]');
    expect(today).toHaveTextContent('الثلاثاء – الخميس');
    expect(today).toHaveTextContent('اليوم');
    const toggle = screen.getByRole('button', { name: 'عرض كل الأيام' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(within(table).getAllByRole('row')).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'عرض مختصر' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
