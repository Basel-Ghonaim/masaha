import type { MapPin } from '@masaha/shared/directory';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { nearMeStore } from '../../hooks/near/nearMeStore';
import { DirectoryView } from '../DirectoryView';
import { ViewSwitch } from '../view/ViewSwitch';

const pin = (id: number, liveStatus: MapPin['liveStatus'] = 'AVAILABLE'): MapPin => ({
  id,
  slug: `space-${String(id)}`,
  nameEn: `Space ${String(id)}`,
  nameAr: `مساحة ${String(id)}`,
  areaId: 2,
  location: { lat: 31.5 + id / 1000, lng: 34.45 },
  isVerified: true,
  days: null,
  cover: null,
  liveStatus,
});

const pins = (list: MapPin[], truncated = false) =>
  ({
    status: 200,
    data: { success: true, data: { pins: list, truncated } },
  }) satisfies FakeAnswer;

/** The directory's page at `path` and `width`: the view switch, then the directory. */
function renderDirectory(
  path: string,
  width: number,
  answer: Parameters<typeof fakeTransport>[0] = () => pins([pin(1), pin(2, null)]),
) {
  stubScreenWidth(width);
  const requests = fakeTransport(answer);
  const router = createMemoryRouter(
    [
      {
        path: '/spaces',
        element: (
          <main>
            <h1>مساحات العمل</h1>
            <ViewSwitch />
            <DirectoryView
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
  return { router, requests };
}

beforeEach(() => {
  startPreferences('ar');
  nearMeStore.clear();
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('the directory’s map', () => {
  it('a chosen pin shows its card from 768 px', async () => {
    renderDirectory('/spaces?view=map', 1440);
    const mark = await screen.findByRole('button', { name: 'مساحة 1 — متاح' });

    mark.focus();
    fireEvent.keyDown(mark, { key: 'Enter' });

    const card = await screen.findByRole('region', { name: 'مساحة 1' });
    expect(within(card).getByText('الرمال · غزة')).toBeInTheDocument();
    expect(within(card).getByText('متاح')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'عرض التفاصيل' })).toHaveAttribute(
      'href',
      '/spaces/space-1',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mark).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(card).getByRole('button', { name: 'إغلاق' }));
    expect(screen.queryByRole('region', { name: 'مساحة 1' })).not.toBeInTheDocument();
    expect(mark).toHaveFocus();
  });

  it('…and below it a sheet that leaves the focus on the map', async () => {
    renderDirectory('/spaces?view=map', 390);
    const mark = await screen.findByRole('button', { name: 'مساحة 1 — متاح' });

    mark.focus();
    fireEvent.keyDown(mark, { key: 'Enter' });

    const sheet = await screen.findByRole('dialog', { name: 'مساحة 1' });
    // Not modal: the map's marks stay reachable, and the page has no scrim over the map.
    expect(screen.getByRole('button', { name: 'مساحة 2 — لا تتوفر حالة مباشرة' })).toBeVisible();
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeNull();
    expect(within(sheet).getByRole('link', { name: 'عرض التفاصيل' })).toHaveAttribute(
      'href',
      '/spaces/space-1',
    );
    expect(screen.queryByRole('region', { name: 'مساحة 1' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mark).toHaveFocus();
    });
  });

  it('the legend names each state beside its mark; the map is axe-clean', async () => {
    renderDirectory('/spaces?view=map', 1440);
    await screen.findByRole('button', { name: 'مساحة 2 — لا تتوفر حالة مباشرة' });

    const legend = screen.getByRole('list', { name: 'دليل الخريطة' });
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['متاح', 'ممتلئ', 'مغلق الآن', 'لا تتوفر حالة مباشرة']);
    for (const item of within(legend).getAllByRole('listitem')) {
      expect(item.querySelector('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(screen.getByRole('region', { name: 'الخريطة' })).toBeInTheDocument();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('with no match, says so over the map and offers clearing the filters', async () => {
    const user = userEvent.setup();
    const { router } = renderDirectory('/spaces?view=map&verified=1&q=Hub', 1440, () => pins([]));

    expect(await screen.findByText('لا توجد مساحات تطابق ما اخترت')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'مسح الفلاتر' }));

    expect(router.state.location.search).toBe('?q=Hub&view=map');
  });

  it('a failure says so and tries again', async () => {
    const user = userEvent.setup();
    const { requests } = renderDirectory('/spaces?view=map', 1440, (_request, index) =>
      index === 0 ? refused(404, { type: 'not_found' }) : pins([pin(1)]),
    );

    expect(await screen.findByText('تعذّر تحميل المساحات')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(await screen.findByRole('button', { name: 'مساحة 1 — متاح' })).toBeInTheDocument();
    expect(requests).toHaveLength(2);
  });

  it('the view switch changes the view in the address, keeping every filter', async () => {
    const user = userEvent.setup();
    const { router } = renderDirectory('/spaces?verified=1&q=Hub&page=2', 1440, (request) =>
      request.url === '/map/spaces'
        ? pins([pin(1)])
        : {
            status: 200,
            data: {
              success: true,
              data: [],
              meta: {
                currentPage: 1,
                limit: 20,
                totalPages: 0,
                totalRecords: 0,
                hasNextPage: false,
                hasPreviousPage: false,
              },
            },
          },
    );
    const views = await screen.findByRole('radiogroup', { name: 'طريقة العرض' });
    expect(within(views).getByRole('radio', { name: 'قائمة' })).toBeChecked();

    await user.click(within(views).getByRole('radio', { name: 'خريطة' }));

    expect(router.state.location.search).toBe('?q=Hub&verified=1&view=map');
    expect(await screen.findByRole('application', { name: 'خريطة المساحات' })).toBeInTheDocument();
    await user.click(within(views).getByRole('radio', { name: 'قائمة' }));
    expect(router.state.location.search).toBe('?q=Hub&verified=1');
  });
});
