import type { DirectorySpace } from '@masaha/shared/directory';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
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
        limit: 20,
        totalPages: count === 0 ? 0 : 1,
        totalRecords: count,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  };
}

/** The directory's list at `path` and `width`, the server answering `count` spaces. */
function renderDirectory({
  path = '/spaces',
  width,
  count = 2,
}: {
  path?: string;
  width: number;
  count?: number;
}) {
  startPreferences('ar');
  stubScreenWidth(width);
  fakeTransport(() => answerOf(count));
  const router = createMemoryRouter(
    [
      {
        path: '/spaces',
        element: (
          <main>
            <h1>مساحات العمل</h1>
            <DirectoryList
              spaceLink={(slug) => `/spaces/${slug}`}
              areaName={() => 'الرمال · غزة'}
              placeFilter={() => <p>المنطقة</p>}
            />
          </main>
        ),
      },
    ],
    { initialEntries: [path] },
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
      renderDirectory({ path: '/spaces?verified=1&students=1&min=10', width });
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
      expect(within(sheet).getByRole('switch', { name: 'المساحات الموثّقة فقط' })).toBeChecked();
      expect(within(sheet).getByRole('group', { name: 'السعر' })).toBeInTheDocument();
      expect(await axe(document.body)).toHaveNoViolations();
    },
  );

  it('its primary button counts the spaces in Arabic agreement and closes the sheet', async () => {
    const user = userEvent.setup();
    renderDirectory({ width: 390, count: 2 });
    await screen.findByRole('link', { name: 'مساحة 1' });

    await user.click(screen.getByRole('button', { name: 'الفلاتر' }));
    const sheet = await screen.findByRole('dialog', { name: 'الفلاتر' });
    await user.click(within(sheet).getByRole('button', { name: 'عرض المساحتين' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it.each([
    [12, 'عرض 12 مساحة'],
    [3, 'عرض 3 مساحات'],
    [1, 'عرض المساحة'],
    [0, 'لا نتائج — غيّر الفلاتر'],
  ])('with %i spaces left, its primary button says «%s»', async (count, words) => {
    const user = userEvent.setup();
    renderDirectory({ path: '/spaces?verified=1', width: 390, count });
    await screen.findByRole('region', { name: 'النتائج' });
    const button = await screen.findByRole('button', { name: 'الفلاتر فلتر واحد مطبّق' });

    await user.click(button);

    const sheet = await screen.findByRole('dialog', { name: 'الفلاتر' });
    expect(within(sheet).getByRole('button', { name: words })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'مسح الفلاتر' })).toBeEnabled();
  });

  it('from 1024 px are a sidebar named «الفلاتر», with no Filters button', async () => {
    renderDirectory({ path: '/spaces?friday=1', width: 1440 });
    await screen.findByRole('link', { name: 'مساحة 1' });

    const sidebar = screen.getByRole('complementary', { name: 'الفلاتر' });
    expect(within(sidebar).getByText('المنطقة')).toBeInTheDocument();
    expect(
      within(sidebar).getByRole('button', { name: 'مفتوحة يوم الجمعة', pressed: true }),
    ).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: 'مسح' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /^الفلاتر/ })).not.toBeInTheDocument();
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
