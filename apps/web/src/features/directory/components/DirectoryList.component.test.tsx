import type { DirectorySpace } from '@masaha/shared/directory';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { fakeTransport, restoreTransport } from '../../../test/fakeTransport';
import { queryWrapper } from '../../../test/queryWrapper';
import { stubScreenWidth } from '../../../test/screenWidth';
import { startPreferences } from '../../../test/startPreferences';
import { DirectoryList } from './DirectoryList';

const space = (id: number, overrides: Partial<DirectorySpace> = {}): DirectorySpace => ({
  id,
  slug: `space-${String(id)}`,
  nameEn: `Space ${String(id)}`,
  nameAr: `مساحة ${String(id)}`,
  area: { id: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: true,
  days: null,
  cover: null,
  liveStatus: 'AVAILABLE',
  ...overrides,
});

/** The server's answer: page `current` of two, two spaces each. */
function answerFor(params: unknown) {
  const current = (params as { page?: number }).page ?? 1;
  const first = current === 1 ? 1 : 3;
  return {
    status: 200,
    data: {
      success: true,
      data: [
        space(first, { cover: '/api/v1/files/spaces/a/card.webp' }),
        space(first + 1, { nameAr: null }),
      ],
      meta: {
        currentPage: current,
        limit: 20,
        totalPages: 2,
        totalRecords: 4,
        hasNextPage: current < 2,
        hasPreviousPage: current > 1,
      },
    },
  };
}

/** The list on the directory's page at `path`, its slots as the page sets them. */
function renderDirectory(path = '/spaces', answer: (params: unknown) => unknown = answerFor) {
  const requests = fakeTransport((request) => answer(request.params) as FakeAnswer);
  const router = createMemoryRouter(
    [
      {
        path: '/spaces',
        element: (
          <main>
            <h1>Workspaces</h1>
            <DirectoryList
              spaceLink={(slug) => `/spaces/${slug}`}
              areaName={() => 'الرمال · غزة'}
              placeFilter={() => null}
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
  return { requests, router };
}

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('DirectoryList', () => {
  it.each([390, 1440])(
    'names the search, the sort, the results and the pages; each card is one link named by its space, its details read after; axe-clean at %i px',
    async (width) => {
      startPreferences('ar');
      stubScreenWidth(width);
      renderDirectory();

      const results = await screen.findByRole('region', { name: 'النتائج' });
      await within(results).findByRole('link', { name: 'مساحة 1' });
      expect(screen.getByRole('searchbox', { name: 'ابحث عن مساحة' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'الترتيب' })).toHaveTextContent(
        'الترتيب: الأحدث تحديثًا',
      );
      expect(screen.getByRole('navigation', { name: 'صفحات المساحات' })).toBeInTheDocument();
      const links = within(results)
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href')?.startsWith('/spaces/'));
      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        '/spaces/space-1',
        '/spaces/space-2',
      ]);
      expect(within(results).getByRole('link', { name: 'مساحة 1' })).toHaveAccessibleDescription(
        'الرمال · غزة متاح موثّقة',
      );
      expect(within(results).getByRole('link', { name: 'Space 2' })).toBeInTheDocument();
      expect(within(results).getByText('Space 2', { selector: 'h3 > span' })).toHaveAttribute(
        'lang',
        'en',
      );
      expect(screen.getByText('4 مساحات في قطاع غزة')).toBeInTheDocument();
      expect(await axe(document.body)).toHaveNoViolations();
    },
  );

  it('moves the focus to the results when the page changes, and only then', async () => {
    startPreferences('ar');
    const user = userEvent.setup();
    renderDirectory();
    const heading = await screen.findByRole('heading', { level: 2, name: 'النتائج' });
    await screen.findByRole('link', { name: 'مساحة 1' });
    expect(heading).not.toHaveFocus();

    await user.click(screen.getByRole('link', { name: 'الصفحة 2' }));

    await screen.findByRole('link', { name: 'مساحة 3' });
    expect(heading).toHaveFocus();
  });

  it('leaves the focus in the search when a search typed on page 2 brings the first page back', async () => {
    startPreferences('ar');
    const user = userEvent.setup();
    const { router } = renderDirectory('/spaces?page=2');
    await screen.findByRole('link', { name: 'مساحة 3' });
    const search = screen.getByRole('searchbox', { name: 'ابحث عن مساحة' });

    await user.type(search, 'Space');

    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=Space');
    });
    await screen.findByRole('link', { name: 'مساحة 1' });
    expect(search).toHaveFocus();
    expect(screen.getByRole('heading', { level: 2, name: 'النتائج' })).not.toHaveFocus();
  });

  it('moves nothing when a pasted page past the last is replaced by the last', async () => {
    startPreferences('ar');
    const { router } = renderDirectory('/spaces?page=5', (params) => {
      const asked = (params as { page?: number }).page ?? 1;
      return asked === 5
        ? {
            status: 200,
            data: {
              success: true,
              data: [],
              meta: {
                currentPage: 5,
                limit: 20,
                totalPages: 2,
                totalRecords: 4,
                hasNextPage: false,
                hasPreviousPage: true,
              },
            },
          }
        : answerFor(params);
    });

    await screen.findByRole('link', { name: 'مساحة 3' });
    expect(router.state.location.search).toBe('?page=2');
    expect(screen.getByRole('heading', { level: 2, name: 'النتائج' })).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it('a cover that fails to load shows the space’s mark in its place', async () => {
    startPreferences('ar');
    renderDirectory();
    const card = await screen.findByRole('link', { name: 'مساحة 1' });
    const cover = card.querySelector('img');
    expect(cover).not.toBeNull();

    fireEvent.error(cover as HTMLImageElement);

    await waitFor(() => {
      expect(card.querySelector('img')).toBeNull();
    });
    expect(within(card).getByText('م', { selector: 'span' })).toBeInTheDocument();
  });

  it('offers «الأفضل تطابقًا» only while a search is typed', async () => {
    startPreferences('ar');
    const user = userEvent.setup();
    renderDirectory();
    await screen.findByRole('link', { name: 'مساحة 1' });

    await user.click(screen.getByRole('combobox', { name: 'الترتيب' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'الأحدث تحديثًا',
      'حسب الاسم',
    ]);
    await user.keyboard('{Escape}');

    await user.type(screen.getByRole('searchbox', { name: 'ابحث عن مساحة' }), 'Space');
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'الترتيب' })).toHaveTextContent(
        'الترتيب: الأفضل تطابقًا',
      );
    });
    await user.click(screen.getByRole('combobox', { name: 'الترتيب' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'الأفضل تطابقًا',
      'الأحدث تحديثًا',
      'حسب الاسم',
    ]);
  });
});
