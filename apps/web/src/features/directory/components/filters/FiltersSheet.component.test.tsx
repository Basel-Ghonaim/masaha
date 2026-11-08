import type { DirectorySpace } from '@masaha/shared/directory';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { DirectoryList } from '../DirectoryList';

const space = (id: number): DirectorySpace => ({
  id,
  slug: `space-${String(id)}`,
  nameEn: `Space ${String(id)}`,
  nameAr: `مساحة ${String(id)}`,
  area: { id: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: true,
  days: null,
  cover: null,
  liveStatus: 'AVAILABLE',
  hoursStatus: null,
});

/** A page holding `count` spaces, at most two drawn. */
function answerOf(count: number) {
  return {
    status: 200,
    data: {
      success: true,
      data: Array.from({ length: Math.min(count, 2) }, (_, index) => space(index + 1)),
      meta: {
        currentPage: 1,
        limit: 18,
        totalPages: count === 0 ? 0 : 1,
        totalRecords: count,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  };
}

/** The subscriptions' lowest and highest prices among the spaces. */
const RANGES = {
  HOUR: null,
  DAY: { minAgorot: 1250, maxAgorot: 9950 },
  WEEK: null,
  MONTH: { minAgorot: 20000, maxAgorot: 45000 },
};

/** The directory's list at `path` (or the history `entries`) and `width`, the server answering `count` spaces. */
function renderDirectory({
  path = '/spaces',
  entries = [path],
  width,
  count = 2,
  language = 'ar',
}: {
  path?: string;
  entries?: string[];
  width: number;
  count?: number;
  language?: 'ar' | 'en';
}) {
  startPreferences(language);
  stubScreenWidth(width);
  fakeTransport((request) => (request.url === '/price-ranges' ? ok(RANGES) : answerOf(count)));
  const router = createMemoryRouter(
    [
      {
        path: '/spaces',
        element: (
          <main>
            <h1>{language === 'ar' ? 'مساحات العمل' : 'Workspaces'}</h1>
            <DirectoryList
              spaceLink={(slug) => `/spaces/${slug}`}
              areaName={() => 'الرمال · غزة'}
              placeFilter={() => <p>المنطقة</p>}
            />
          </main>
        ),
      },
    ],
    { initialEntries: entries, initialIndex: entries.length - 1 },
  );
  const Wrapper = queryWrapper();
  render(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  );
  return router;
}

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('the directory’s filters', () => {
  it.each([390, 768])(
    'below 1024 px open from a button that says whether the sheet is open and how many filters apply (%i px)',
    async (width) => {
      const user = userEvent.setup();
      renderDirectory({ path: '/spaces?verified=1&students=1&period=DAY', width });
      await screen.findByRole('link', { name: 'مساحة 1' });

      const button = screen.getByRole('button', { name: 'الفلاتر 3 فلاتر مطبّقة' });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(within(button).getByText('3')).toHaveAttribute('aria-hidden', 'true');
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();

      await user.click(button);

      const sheet = await screen.findByRole('dialog', { name: 'الفلاتر' });
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-controls', sheet.id);
      expect(within(sheet).getByText('المنطقة')).toBeInTheDocument();
      expect(within(sheet).getByRole('checkbox', { name: 'المساحات الموثّقة فقط' })).toBeChecked();
      expect(within(sheet).getByRole('group', { name: 'السعر' })).toBeInTheDocument();
      expect(await axe(document.body)).toHaveNoViolations();
    },
  );

  it('its primary button counts the results in Arabic agreement and closes the sheet', async () => {
    const user = userEvent.setup();
    renderDirectory({ width: 390, count: 2 });
    await screen.findByRole('link', { name: 'مساحة 1' });

    await user.click(screen.getByRole('button', { name: 'الفلاتر' }));
    const sheet = await screen.findByRole('dialog', { name: 'الفلاتر' });
    await user.click(within(sheet).getByRole('button', { name: 'عرض نتيجتين' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it.each([
    ['ar', 0, 'لا توجد نتائج'],
    ['ar', 1, 'عرض نتيجة واحدة'],
    ['ar', 2, 'عرض نتيجتين'],
    ['ar', 3, 'عرض 3 نتائج'],
    ['ar', 10, 'عرض 10 نتائج'],
    ['ar', 11, 'عرض 11 نتيجة'],
    ['ar', 100, 'عرض 100 نتيجة'],
    ['en', 0, 'No results'],
    ['en', 1, 'Show 1 result'],
    ['en', 12, 'Show 12 results'],
  ] as const)(
    'in %s, with %i results left, its primary button says «%s»',
    async (language, count, words) => {
      const user = userEvent.setup();
      renderDirectory({ path: '/spaces?verified=1', width: 390, count, language });
      await screen.findByRole('region', { name: language === 'ar' ? 'النتائج' : 'Results' });
      const button = await screen.findByRole('button', {
        name: language === 'ar' ? 'الفلاتر فلتر واحد مطبّق' : 'Filters 1 filter applied',
      });

      await user.click(button);

      const sheet = await screen.findByRole('dialog', {
        name: language === 'ar' ? 'الفلاتر' : 'Filters',
      });
      expect(within(sheet).getByRole('button', { name: words })).toBeInTheDocument();
      expect(
        within(sheet).getByRole('button', {
          name: language === 'ar' ? 'مسح الفلاتر' : 'Clear filters',
        }),
      ).toBeEnabled();
    },
  );

  it('from 1024 px are a sidebar named «الفلاتر», with no Filters button', async () => {
    renderDirectory({ path: '/spaces?friday=1', width: 1440 });
    await screen.findByRole('link', { name: 'مساحة 1' });

    const sidebar = screen.getByRole('complementary', { name: 'الفلاتر' });
    expect(within(sidebar).getByText('المنطقة')).toBeInTheDocument();
    expect(within(sidebar).getByRole('checkbox', { name: 'مفتوحة يوم الجمعة' })).toBeChecked();
    expect(within(sidebar).getByRole('button', { name: 'مسح' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /^الفلاتر/ })).not.toBeInTheDocument();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('reads top to bottom «المنطقة», «السعر», «الدوام» and «أخرى», each box in its group, with no switch', async () => {
    renderDirectory({ width: 1440 });
    await screen.findByRole('link', { name: 'مساحة 1' });
    const sidebar = within(screen.getByRole('complementary', { name: 'الفلاتر' }));

    const inOrder = [
      sidebar.getByText('المنطقة'),
      ...['السعر', 'الدوام', 'أخرى'].map((name) => sidebar.getByRole('group', { name })),
    ];
    for (const [index, element] of inOrder.slice(1).entries()) {
      expect(
        (inOrder[index] as HTMLElement).compareDocumentPosition(element) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    const boxes = (group: string, names: string[]) => {
      const inGroup = within(sidebar.getByRole('group', { name: group }));
      expect(inGroup.getAllByRole('checkbox')).toEqual(
        names.map((name) => inGroup.getByRole('checkbox', { name })),
      );
    };
    boxes('الدوام', ['مفتوحة الآن', 'مفتوحة مساءً', 'مفتوحة يوم الجمعة']);
    boxes('أخرى', ['المساحات الموثّقة فقط', 'أسعار للطلاب']);
    expect(sidebar.queryByRole('switch')).not.toBeInTheDocument();
    expect(sidebar.queryByText('المساحات')).not.toBeInTheDocument();
  });

  it.each([
    ['open=1', 'مفتوحة الآن', 'open=1'],
    ['evening=1', 'مفتوحة مساءً', 'evening=1'],
    ['friday=1', 'مفتوحة يوم الجمعة', 'friday=1'],
    ['verified=1', 'المساحات الموثّقة فقط', 'verified=1'],
    ['students=1', 'أسعار للطلاب', 'students=1'],
  ])('the box of %s shows the address and writes it', async (_, name, key) => {
    const user = userEvent.setup();
    const router = renderDirectory({ width: 1440 });
    await screen.findByRole('link', { name: 'مساحة 1' });
    const box = screen.getByRole('checkbox', { name });
    expect(box).not.toBeChecked();

    await user.click(box);

    expect(router.state.location.search).toBe(`?${key}`);
    expect(screen.getByRole('checkbox', { name })).toBeChecked();
  });

  it('counts each box once, the place once whatever its number of areas, and the price once', async () => {
    renderDirectory({
      path: '/spaces?area=3,7&period=DAY&min=10&open=1&evening=1&friday=1&verified=1&students=1',
      width: 390,
    });
    await screen.findByRole('link', { name: 'مساحة 1' });

    expect(screen.getByRole('button', { name: 'الفلاتر 7 فلاتر مطبّقة' })).toBeInTheDocument();
  });

  it('the price: «الكل» chosen with its hint and no budget; a subscription writes its period at once and shows «من» and «إلى» hinted by its prices', async () => {
    const user = userEvent.setup();
    const router = renderDirectory({ width: 1440 });
    await screen.findByRole('link', { name: 'مساحة 1' });
    const price = within(screen.getByRole('group', { name: 'السعر' }));

    const subscription = price.getByRole('radiogroup', { name: 'نوع الاشتراك' });
    expect(subscription).toHaveAccessibleDescription(
      'اختر نوع الاشتراك لتحديد نطاق السعر أو الترتيب حسبه.',
    );
    expect(price.getByRole('radio', { name: 'الكل' })).toBeChecked();
    expect(price.queryByRole('textbox', { name: 'من' })).not.toBeInTheDocument();

    await user.click(price.getByRole('radio', { name: 'يوم' }));

    expect(router.state.location.search).toBe('?period=DAY');
    expect(price.getByRole('radio', { name: 'يوم' })).toBeChecked();
    expect(subscription).toHaveAccessibleDescription('بالشيكل، على السعر اليومي.');
    expect(await price.findByRole('textbox', { name: 'من' })).toHaveAttribute('placeholder', '12');
    expect(price.getByRole('textbox', { name: 'إلى' })).toHaveAttribute('placeholder', '100');
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('a refused bound is said on its field, and «إلى» under «من» on «إلى»', async () => {
    const user = userEvent.setup();
    renderDirectory({ path: '/spaces?period=MONTH', width: 1440 });
    const from = await screen.findByRole('textbox', { name: 'من' });

    await user.type(from, '0');
    expect(from).toHaveAccessibleDescription('اكتب مبلغًا بالشيكل أكبر من صفر');
    await user.clear(from);
    await user.type(from, '400');
    const to = screen.getByRole('textbox', { name: 'إلى' });
    await user.type(to, '300');

    expect(to).toHaveAccessibleDescription('«إلى» أقل من «من».');
    expect(from).not.toHaveAccessibleDescription();
  });

  it('shows the state an address holds, again after a reload, and the one before on Back', async () => {
    const user = userEvent.setup();
    const address = '/spaces?period=MONTH&min=100&open=1&students=1';
    const router = renderDirectory({ entries: ['/spaces?verified=1', address], width: 1440 });
    await screen.findByRole('link', { name: 'مساحة 1' });

    expect(screen.getByRole('radio', { name: 'شهر' })).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'من' })).toHaveValue('100');
    expect(screen.getByRole('checkbox', { name: 'مفتوحة الآن' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'أسعار للطلاب' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'المساحات الموثّقة فقط' })).not.toBeChecked();

    // A change replaces the address: Back still leads to the entry before.
    await user.click(screen.getByRole('checkbox', { name: 'مفتوحة مساءً' }));
    expect(router.state.location.search).toBe('?period=MONTH&min=100&open=1&evening=1&students=1');
    expect(router.state.historyAction).toBe('REPLACE');

    // A reload: a new router at the same address.
    cleanup();
    restoreTransport();
    renderDirectory({
      path: '/spaces?period=MONTH&min=100&open=1&evening=1&students=1',
      width: 1440,
    });
    await screen.findByRole('link', { name: 'مساحة 1' });
    expect(screen.getByRole('radio', { name: 'شهر' })).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'من' })).toHaveValue('100');
    expect(screen.getByRole('checkbox', { name: 'مفتوحة مساءً' })).toBeChecked();
    cleanup();
    restoreTransport();

    const again = renderDirectory({ entries: ['/spaces?verified=1', address], width: 1440 });
    await screen.findByRole('link', { name: 'مساحة 1' });
    await act(async () => {
      await again.navigate(-1);
    });
    expect(again.state.location.search).toBe('?verified=1');
    expect(screen.getByRole('checkbox', { name: 'المساحات الموثّقة فقط' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'الكل' })).toBeChecked();
  });

  it('opens an old «?available=1» unfiltered, with no such control', async () => {
    renderDirectory({ path: '/spaces?available=1', width: 1440 });
    await screen.findByRole('link', { name: 'مساحة 1' });
    const sidebar = within(screen.getByRole('complementary', { name: 'الفلاتر' }));

    for (const box of sidebar.getAllByRole('checkbox')) expect(box).not.toBeChecked();
    expect(sidebar.getByRole('radio', { name: 'الكل' })).toBeChecked();
    expect(sidebar.getByRole('button', { name: 'مسح' })).toBeDisabled();
    expect(sidebar.queryByText(/متاحة/)).not.toBeInTheDocument();
  });
});
