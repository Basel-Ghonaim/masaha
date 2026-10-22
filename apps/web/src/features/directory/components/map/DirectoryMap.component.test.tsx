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

/** An empty page of the list, as the server gives it. */
const emptyPage = {
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
} satisfies FakeAnswer;

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
    // The card, the legend and the rest of the overlay come before the marks in the tab order.
    const details = within(card).getByRole('link', { name: 'عرض التفاصيل' });
    for (const other of screen.getAllByRole('button', { name: /^مساحة/ })) {
      expect(
        details.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(screen.getByRole('list', { name: 'دليل الخريطة' }).compareDocumentPosition(mark)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    fireEvent.click(within(card).getByRole('button', { name: 'إغلاق' }));
    expect(screen.queryByRole('region', { name: 'مساحة 1' })).not.toBeInTheDocument();
    expect(mark).toHaveFocus();
  });

  it('Escape closes the card from 768 px, and the focus returns to its mark', async () => {
    const user = userEvent.setup();
    renderDirectory('/spaces?view=map', 1024);
    const mark = await screen.findByRole('button', { name: 'مساحة 1 — متاح' });

    mark.focus();
    fireEvent.keyDown(mark, { key: 'Enter' });
    expect(await screen.findByRole('region', { name: 'مساحة 1' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'مساحة 1' })).not.toBeInTheDocument();
    expect(mark).toHaveFocus();

    fireEvent.keyDown(mark, { key: 'Enter' });
    const card = await screen.findByRole('region', { name: 'مساحة 1' });
    within(card).getByRole('link', { name: 'عرض التفاصيل' }).focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'مساحة 1' })).not.toBeInTheDocument();
    expect(mark).toHaveFocus();
  });

  it('the sheet’s «إغلاق» and Escape return the focus to its mark', async () => {
    const user = userEvent.setup();
    renderDirectory('/spaces?view=map', 390);
    const mark = await screen.findByRole('button', { name: 'مساحة 1 — متاح' });

    mark.focus();
    fireEvent.keyDown(mark, { key: 'Enter' });
    const sheet = await screen.findByRole('dialog', { name: 'مساحة 1' });
    await user.click(within(sheet).getByRole('button', { name: 'إغلاق' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'مساحة 1' })).not.toBeInTheDocument();
    });
    expect(mark).toHaveFocus();

    fireEvent.keyDown(mark, { key: 'Enter' });
    await screen.findByRole('dialog', { name: 'مساحة 1' });
    within(await screen.findByRole('dialog', { name: 'مساحة 1' }))
      .getByRole('link', { name: 'عرض التفاصيل' })
      .focus();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'مساحة 1' })).not.toBeInTheDocument();
    });
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
    // The sheet takes no focus, so one polite line says where the details are.
    expect(screen.getByText('مساحة 1: التفاصيل في أسفل الصفحة')).toBeInTheDocument();
    expect(
      screen.getByText('مساحة 1: التفاصيل في أسفل الصفحة').closest('[role="status"]'),
    ).not.toBeNull();
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

  it('while the pins first load, says so over the map and marks the section busy', async () => {
    let answer: (value: FakeAnswer) => void = () => undefined;
    renderDirectory(
      '/spaces?view=map',
      1440,
      () =>
        new Promise<FakeAnswer>((resolve) => {
          answer = resolve;
        }),
    );

    expect(await screen.findByText('جارٍ تحميل المساحات…')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'الخريطة' })).toHaveAttribute('aria-busy', 'true');

    answer(pins([pin(1)]));
    expect(await screen.findByRole('button', { name: 'مساحة 1 — متاح' })).toBeInTheDocument();
    expect(screen.queryByText('جارٍ تحميل المساحات…')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'الخريطة' })).toHaveAttribute('aria-busy', 'false');
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

  it('picks a point at the centre: the map takes the focus, «ثبّت الموقع هنا» places it, «رجوع» restores the one before', async () => {
    const user = userEvent.setup();
    nearMeStore.startPick();
    renderDirectory('/spaces?view=map', 1440);

    const card = await screen.findByRole('region', { name: 'حدّد موقعك على الخريطة' });
    const map = screen.getByRole('application', { name: 'خريطة المساحات' });
    await waitFor(() => {
      expect(map).toHaveFocus();
    });
    expect(map).toHaveAccessibleDescription('الأسهم تحرّك الخريطة تحت العلامة في الوسط.');
    expect(screen.queryByRole('button', { name: 'الأقرب إليّ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'مساحة 1 — متاح' })).not.toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'ثبّت الموقع هنا' }));

    expect(await screen.findByRole('img', { name: 'موقعي (يدوي)' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'الأقرب إليّ' })).toHaveFocus();
    });
    expect(screen.getByRole('button', { name: 'الأقرب إليّ' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'تغيير الموقع' }));
    const again = await screen.findByRole('region', { name: 'حدّد موقعك على الخريطة' });
    await user.click(within(again).getByRole('button', { name: 'رجوع' }));
    expect(await screen.findByRole('img', { name: 'موقعي (يدوي)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تغيير الموقع' })).toBeInTheDocument();
  });

  it('below 1024 px, the picking card stands under the map, clear of its centre', async () => {
    nearMeStore.startPick();
    renderDirectory('/spaces?view=map', 1000);

    const card = await screen.findByRole('region', { name: 'حدّد موقعك على الخريطة' });
    // Not in the map's overlay, which lies over the map (absolutely placed).
    expect(card.closest('.absolute')).toBeNull();
    const map = screen.getByRole('application', { name: 'خريطة المساحات' });
    expect(map.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('the pick ends with the map: the list shows the location from before, and the map opens again without the crosshair', async () => {
    const user = userEvent.setup();
    nearMeStore.placePin({ lat: 31.501, lng: 34.467 });
    const { requests } = renderDirectory('/spaces?view=map', 1440, (request) =>
      request.url === '/map/spaces' ? pins([pin(1)]) : emptyPage,
    );

    await user.click(await screen.findByRole('button', { name: 'تغيير الموقع' }));
    expect(
      await screen.findByRole('region', { name: 'حدّد موقعك على الخريطة' }),
    ).toBeInTheDocument();
    const views = screen.getByRole('radiogroup', { name: 'طريقة العرض' });
    await user.click(within(views).getByRole('radio', { name: 'قائمة' }));

    expect(
      await screen.findByText('مرتبة حسب المسافة من الموقع الذي حدّدته على الخريطة.', {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تغيير الموقع' })).toBeInTheDocument();
    await waitFor(() => {
      expect(requests.at(-1)?.headers['Masaha-Near']).toBe('31.501,34.467');
    });
    expect(requests.at(-1)?.params).toMatchObject({ sort: 'distance' });

    await user.click(within(views).getByRole('radio', { name: 'خريطة' }));
    expect(await screen.findByRole('application', { name: 'خريطة المساحات' })).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'حدّد موقعك على الخريطة' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'الأقرب إليّ' })).toBeInTheDocument();
  });

  it('on the map, a location in use says it is shown there and orders the list, with no privacy line and no stop', async () => {
    nearMeStore.granted({ lat: 31.501, lng: 34.467 }, 'device');
    const { requests } = renderDirectory('/spaces?view=map', 1440);

    const line = await screen.findByText(
      'موقعك ظاهر على الخريطة. تُرتَّب القائمة حسب المسافة منه.',
    );
    const status = line.closest('[role="status"]');
    expect(status).not.toBeNull();
    expect(status).not.toHaveTextContent('يُرسَل موقعك');
    expect(
      screen.queryByRole('button', { name: 'إيقاف الترتيب حسب المسافة' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'مسح موقعي' })).toBeInTheDocument();
    for (const request of requests) expect(request.headers['Masaha-Near']).toBeUndefined();

    nearMeStore.placePin({ lat: 31.52, lng: 34.44 });
    expect(
      await screen.findByText('موقعك ظاهر على الخريطة. تُرتَّب القائمة حسب المسافة منه.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تغيير الموقع' })).toBeInTheDocument();
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
