import type { SpaceHours } from '@masaha/shared/spaces';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { publicSpace } from '../../../../test/publicSpace';
import { queryWrapper } from '../../../../test/queryWrapper';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { nearMeStore } from '../../hooks/near/nearMeStore';
import { SpaceDetails } from './SpaceDetails';

const NOW = new Date('2026-10-22T10:00:00Z');

/** The page's details at `width`, the server answering with `space`. */
function renderDetails(
  width: number,
  space = publicSpace(),
  ownerContact = <p>البريد</p>,
  status: 'AVAILABLE' | 'FULL' | 'CLOSED' | null | 'ERROR' = 'AVAILABLE',
) {
  stubScreenWidth(width);
  fakeTransport((request) =>
    request.url?.endsWith('/occupancy')
      ? status === 'ERROR'
        ? refused(404, { type: 'not_found' })
        : ok({ status })
      : ok(space),
  );
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

  it('names a contact of another kind by its own name, isolated from the page’s direction', async () => {
    renderDetails(
      1440,
      publicSpace({
        contacts: [{ type: 'OTHER', value: 'https://discord.gg/noor', label: 'Discord' }],
      }),
    );

    const link = await screen.findByRole('link', { name: /Discord/ });
    expect(link).toHaveAttribute('href', 'https://discord.gg/noor');
    expect(link).toHaveAttribute('target', '_blank');
    expect(within(link).getByText('Discord')).toHaveAttribute('dir', 'auto');
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
          worksEvenings: false,
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

  it('says «دوام مسائي» in the hours while its owner declares the evening, and nothing otherwise', async () => {
    const space = publicSpace();
    renderDetails(
      1440,
      publicSpace({ hours: { ...(space.hours as SpaceHours), worksEvenings: true } }),
    );
    const hours = (await screen.findByRole('heading', { level: 2, name: 'ساعات العمل' })).closest(
      'section',
    ) as HTMLElement;
    expect(within(hours).getByText('دوام مسائي')).toBeInTheDocument();
    cleanup();

    renderDetails(1440, space);
    await screen.findByRole('heading', { level: 2, name: 'ساعات العمل' });
    expect(screen.queryByText('دوام مسائي')).toBeNull();
  });

  it('says «Evening hours» in the hours in English, with no detectable accessibility violations', async () => {
    startPreferences('en');
    const space = publicSpace();
    renderDetails(
      1440,
      publicSpace({ hours: { ...(space.hours as SpaceHours), worksEvenings: true } }),
    );
    const hours = (await screen.findByRole('heading', { level: 2, name: 'Opening hours' })).closest(
      'section',
    ) as HTMLElement;

    expect(within(hours).getByText('Evening hours')).toBeInTheDocument();
    expect(await axe(hours)).toHaveNoViolations();
  });

  it('shows the gallery pill for more than one photo and circles in its viewer', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderDetails(
      390,
      publicSpace({
        photos: [
          { card: '/one-card.jpg', page: '/one-page.jpg' },
          { card: '/two-card.jpg', page: '/two-page.jpg' },
          { card: '/three-card.jpg', page: '/three-page.jpg' },
        ],
      }),
    );

    expect(await screen.findByRole('button', { name: 'عرض الصورة 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'عرض الصورة 1' }));
    expect(await screen.findByRole('dialog', { name: 'صور نور هب' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'الصورة 1 من 3 — نور هب' })).toHaveAttribute(
      'src',
      '/one-page.jpg',
    );
    await user.click(screen.getByRole('button', { name: 'التالية' }));
    expect(screen.getByRole('img', { name: 'الصورة 2 من 3 — نور هب' })).toHaveAttribute(
      'src',
      '/two-page.jpg',
    );
    await user.click(screen.getByRole('button', { name: 'السابقة' }));
    expect(screen.getByRole('img', { name: 'الصورة 1 من 3 — نور هب' })).toBeInTheDocument();
  });

  it('counts every photo in the viewer’s position, past the five tiles, and wraps', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const photos = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
      card: `/${String(n)}-card.jpg`,
      page: `/${String(n)}-page.jpg`,
    }));
    renderDetails(1440, publicSpace({ photos }));

    await user.click(await screen.findByRole('button', { name: 'عرض الصورة 1' }));
    const viewer = await screen.findByRole('dialog', { name: 'صور نور هب' });
    expect(within(viewer).getByText('1 / 7')).toBeInTheDocument();
    for (let step = 0; step < 5; step += 1) {
      await user.click(within(viewer).getByRole('button', { name: 'التالية' }));
    }
    expect(within(viewer).getByText('6 / 7')).toBeInTheDocument();
    await user.click(within(viewer).getByRole('button', { name: 'التالية' }));
    expect(within(viewer).getByText('7 / 7')).toBeInTheDocument();
    await user.click(within(viewer).getByRole('button', { name: 'التالية' }));
    expect(within(viewer).getByText('1 / 7')).toBeInTheDocument();
  });

  it('hands the focus back to the tile that opened the viewer when Escape closes it', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const photos = [1, 2, 3].map((n) => ({
      card: `/${String(n)}-card.jpg`,
      page: `/${String(n)}-page.jpg`,
    }));
    renderDetails(1440, publicSpace({ photos }));

    await user.click(await screen.findByRole('button', { name: 'عرض الصورة 2' }));
    const viewer = await screen.findByRole('dialog', { name: 'صور نور هب' });
    await user.click(within(viewer).getByRole('button', { name: 'التالية' }));
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'عرض الصورة 2' })).toHaveFocus();
  });

  it.each([2, 3, 5])('with %i photos, a phone shows the first tile alone', async (count) => {
    const photos = Array.from({ length: count }, (_, n) => ({
      card: `/${String(n)}-card.jpg`,
      page: `/${String(n)}-page.jpg`,
    }));
    renderDetails(390, publicSpace({ photos }));

    const first = await screen.findByRole('button', { name: 'عرض الصورة 1' });
    expect(first.parentElement).toHaveClass('grid-cols-1');
    expect(first).not.toHaveClass('hidden');
    for (let n = 2; n <= count; n += 1) {
      expect(screen.getByRole('button', { name: `عرض الصورة ${String(n)}` })).toHaveClass(
        'hidden',
        'md:block',
      );
    }
  });

  it('says when a verified space has no live status and when the first read fails', async () => {
    renderDetails(390, publicSpace());
    expect(await screen.findByText('الحالة مباشرة الآن')).toBeInTheDocument();

    cleanup();
    renderDetails(390, publicSpace(), <p>البريد</p>, null);
    expect(
      await screen.findByText('لم تكتمل معلومات الحالة المباشرة لهذه المساحة بعد.'),
    ).toBeInTheDocument();
    restoreTransport();
    cleanup();
    renderDetails(390, publicSpace({ isVerified: false }), <p>البريد</p>, null);
    expect(
      await screen.findByText('الحالة المباشرة تظهر للمساحات الموثّقة فقط'),
    ).toBeInTheDocument();
    restoreTransport();
    cleanup();
    renderDetails(390, publicSpace(), <p>البريد</p>, 'ERROR');
    expect(await screen.findByText('تعذّر قراءة الحالة الآن')).toBeInTheDocument();
  });

  it('draws the status panel with no hours and no point near me, saying in it and in the hours that they are not available', async () => {
    renderDetails(390, publicSpace({ hours: null }));

    const panel = await screen.findByRole('heading', { level: 2, name: 'الحالة' });
    expect(panel).toBeInTheDocument();
    expect(await screen.findByText('الحالة مباشرة الآن')).toBeInTheDocument();
    // The status card's line and the hours section's.
    expect(screen.getAllByText('ساعات العمل غير متوفرة')).toHaveLength(2);
    expect(screen.queryByText('لم تُضف ساعات العمل بعد')).not.toBeInTheDocument();
  });

  it('says «مغلقة مؤقتًا اليوم» for today while a closure runs', async () => {
    renderDetails(
      390,
      publicSpace({
        announcements: [
          {
            id: 1,
            type: 'CLOSURE',
            textAr: 'مغلقون للصيانة',
            textEn: null,
            startsAt: '2026-10-22T06:00:00+03:00',
            endsAt: '2026-10-23T06:00:00+03:00',
          },
        ],
      }),
    );

    expect(await screen.findByText('مغلقة مؤقتًا اليوم')).toBeInTheDocument();
  });

  it('shows the visitor’s point on the location map while near me holds one', async () => {
    nearMeStore.granted({ lat: 31.521, lng: 34.451 }, 'device');
    renderDetails(390);

    expect(await screen.findByRole('img', { name: 'موقعك' })).toBeInTheDocument();
  });

  it('offers «الاتجاهات» as the location section’s own action, beside its heading', async () => {
    renderDetails(390);

    const heading = await screen.findByRole('heading', { level: 2, name: 'الموقع' });
    const directions = screen.getByRole('link', { name: 'الاتجاهات' });
    expect(heading.parentElement).toContainElement(directions);
  });

  it('names the phone’s single tile with the gallery’s «عرض كل الصور (n)»', async () => {
    renderDetails(
      390,
      publicSpace({
        photos: [
          { card: '/one-card.jpg', page: '/one-page.jpg' },
          { card: '/two-card.jpg', page: '/two-page.jpg' },
          { card: '/three-card.jpg', page: '/three-page.jpg' },
        ],
      }),
    );

    expect(await screen.findByRole('button', { name: 'عرض الصورة 1' })).toHaveAccessibleDescription(
      'عرض كل الصور (3)',
    );
  });

  it('says how old the status is once a refresh failed past 3 minutes, its badge neutral, until a success', async () => {
    renderDetails(390, publicSpace(), <p>البريد</p>, 'FULL');
    expect(await screen.findByText('ممتلئ')).toBeInTheDocument();

    fakeTransport((request) =>
      request.url?.endsWith('/occupancy') ? refused(403, { type: 'forbidden' }) : ok(publicSpace()),
    );
    await vi.advanceTimersByTimeAsync(60_000);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(screen.getByText('الحالة مباشرة الآن')).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(60_000);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(await screen.findByText('آخر تحديث قبل 4 دقائق')).toBeInTheDocument();
    expect(screen.queryByText('الحالة مباشرة الآن')).not.toBeInTheDocument();
    expect(screen.getByText('ممتلئ')).toHaveAttribute('data-variant', 'neutral');

    fakeTransport((request) =>
      request.url?.endsWith('/occupancy') ? ok({ status: 'FULL' }) : ok(publicSpace()),
    );
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await screen.findByText('الحالة مباشرة الآن')).toBeInTheDocument();
    expect(screen.getByText('ممتلئ')).toHaveAttribute('data-variant', 'warning');
  });

  it('keeps the last live status when a later refresh fails', async () => {
    renderDetails(390, publicSpace());
    expect(await screen.findByText('متاح')).toBeInTheDocument();

    const requests = fakeTransport((request) =>
      request.url?.endsWith('/occupancy') ? refused(404, { type: 'not_found' }) : ok(publicSpace()),
    );
    await vi.advanceTimersByTimeAsync(60_000);
    await waitFor(() => {
      expect(requests.some((request) => request.url?.endsWith('/occupancy'))).toBe(true);
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(screen.queryByText('تعذّر قراءة الحالة الآن')).not.toBeInTheDocument();
    expect(screen.getByText('متاح')).toBeInTheDocument();
  });
});
