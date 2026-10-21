import type { DirectorySpace } from '@masaha/shared/directory';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { fakeGeolocation } from '../../../../test/fakeGeolocation';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { nearMeStore } from '../../hooks/near/nearMeStore';
import { DirectoryList } from '../DirectoryList';

const PRIVACY = 'يُرسَل موقعك مقرَّبًا لترتيب المساحات حسب المسافة فقط، ولا يُحفظ.';

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

/** The directory's list at `width`, the place filter a button the page's slot would draw. */
function renderDirectory(width: number) {
  stubScreenWidth(width);
  fakeTransport(() => ({
    status: 200,
    data: {
      success: true,
      data: [space(1)],
      meta: {
        currentPage: 1,
        limit: 20,
        totalPages: 1,
        totalRecords: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  }));
  const router = createMemoryRouter(
    [
      {
        path: '/spaces',
        element: (
          <DirectoryList
            spaceLink={(slug) => `/spaces/${slug}`}
            areaName={() => 'الرمال · غزة'}
            placeFilter={() => <button type="button">المنطقة</button>}
          />
        ),
      },
    ],
    { initialEntries: ['/spaces'] },
  );
  const Wrapper = queryWrapper();
  render(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  );
}

beforeEach(() => {
  startPreferences('ar');
  nearMeStore.clear();
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('LocationStatus', () => {
  it('shows the privacy line while locating and in use, never once the location was refused or imprecise', async () => {
    const device = fakeGeolocation();
    const user = userEvent.setup();
    renderDirectory(390);
    await screen.findByRole('link', { name: 'مساحة 1' });
    expect(screen.queryByText(PRIVACY, { exact: false })).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'الأقرب إليّ' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    expect(screen.getByRole('status')).toHaveTextContent(`جارٍ تحديد موقعك… ${PRIVACY}`);

    act(() => {
      device.succeed(31.5, 34.46, 30);
    });
    expect(
      screen.getByText(`مرتبة حسب المسافة من موقعك. المسافات تقريبية بخط مستقيم. ${PRIVACY}`),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'الأقرب إليّ' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'إيقاف الترتيب حسب المسافة' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'مسح موقعي' }));
    expect(screen.queryByText(PRIVACY, { exact: false })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'الأقرب إليّ' }));
    act(() => {
      device.fail();
    });
    expect(screen.getByText('تعذّر تحديد موقعك')).toBeInTheDocument();
    expect(screen.queryByText(PRIVACY, { exact: false })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'الأقرب إليّ' }));
    act(() => {
      device.succeed(31.5, 34.46, 5000);
    });
    expect(screen.getByText('تعذّر تحديد موقعك بدقة')).toBeInTheDocument();
    expect(
      screen.getByText(
        'يبدو أن موقعك خارج قطاع غزة، أو أن هامش الخطأ فيه أكبر من 2 كم، فلم نستخدمه.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(PRIVACY, { exact: false })).not.toBeInTheDocument();
  });

  it('the refused states offer «اختر منطقتك», which focuses the place filter from 1024 px', async () => {
    const device = fakeGeolocation();
    const user = userEvent.setup();
    renderDirectory(1440);
    await screen.findByRole('link', { name: 'مساحة 1' });
    await user.click(screen.getByRole('button', { name: 'الأقرب إليّ' }));
    act(() => {
      device.fail();
    });

    await user.click(screen.getByRole('button', { name: 'اختر منطقتك' }));

    const sidebar = screen.getByRole('complementary', { name: 'الفلاتر' });
    expect(within(sidebar).getByRole('button', { name: 'المنطقة' })).toHaveFocus();
  });

  it('…and opens the filters’ sheet below 1024 px', async () => {
    const device = fakeGeolocation();
    const user = userEvent.setup();
    renderDirectory(390);
    await screen.findByRole('link', { name: 'مساحة 1' });
    await user.click(screen.getByRole('button', { name: 'الأقرب إليّ' }));
    act(() => {
      device.succeed(30.044, 31.236, 20);
    });

    await user.click(screen.getByRole('button', { name: 'اختر منطقتك' }));

    const sheet = await screen.findByRole('dialog', { name: 'الفلاتر' });
    await waitFor(() => {
      expect(within(sheet).getByRole('button', { name: 'المنطقة' })).toHaveFocus();
    });
  });
});
