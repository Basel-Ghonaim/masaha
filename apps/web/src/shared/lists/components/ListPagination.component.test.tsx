import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  MemoryRouter,
  Outlet,
  RouterProvider,
  ScrollRestoration,
} from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { paginationView } from '../services/paginationView';
import { ListPagination } from './ListPagination';

const words = {
  label: 'Pages of customers',
  more: 'More pages',
  previous: 'Previous',
  next: 'Next',
  page: ({ page }: { page: number }) => `Page ${String(page)}`,
  summary: ({ page, total }: { page: number; total: number }) =>
    `Page ${String(page)} of ${String(total)}`,
};
const searchOf = (page: number) => `?page=${String(page)}`;

function never(): never {
  throw new Error('no pages');
}

function renderPages(total: number, current = 1) {
  const view = paginationView({ current, total, words, searchOf });
  if (view === null) throw new Error('no pages');
  return render(
    <MemoryRouter initialEntries={[`/customers?page=${String(current)}`]}>
      <ListPagination pagination={view} />
    </MemoryRouter>,
  );
}

describe('ListPagination', () => {
  it('shows no bar for a one-page list', () => {
    renderPages(1);

    expect(screen.queryByRole('navigation', { name: 'Pages of customers' })).toBeNull();
  });

  it('shows the bar for a two-page list, as today', () => {
    renderPages(2);

    expect(screen.getByRole('navigation', { name: 'Pages of customers' })).toBeInTheDocument();
  });

  it('marks the page asked current at once, before its answer arrives', async () => {
    renderPages(3, 1);
    const pages = screen.getByRole('navigation', { name: 'Pages of customers' });
    const second = within(pages).getByRole('link', { name: 'Page 2' });

    // The view still holds the answer's page, 1: the address alone says 2 was asked.
    await userEvent.click(second);

    expect(second).toHaveAttribute('aria-current', 'page');
    expect(within(pages).getByRole('link', { name: 'Page 1' })).not.toHaveAttribute('aria-current');
  });

  it('marks the answer’s page when the address names none', () => {
    render(
      <MemoryRouter initialEntries={['/customers']}>
        <ListPagination
          pagination={paginationView({ current: 1, total: 3, words, searchOf }) ?? never()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
  });

  describe('on a page with the app’s scroll restoration', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    function Root() {
      return (
        <>
          <ScrollRestoration />
          <Outlet />
        </>
      );
    }

    function Customers() {
      const view = paginationView({ current: 1, total: 3, words, searchOf }) ?? never();
      return <ListPagination pagination={view} />;
    }

    it.each(['Page 2', 'Next'])(
      'keeps the scroll where it is when %s is followed',
      async (name) => {
        const scrollTo = vi.fn();
        vi.stubGlobal('scrollTo', scrollTo);
        const router = createMemoryRouter(
          [{ element: <Root />, children: [{ path: '/customers', element: <Customers /> }] }],
          { initialEntries: ['/customers'] },
        );
        render(<RouterProvider router={router} />);
        scrollTo.mockClear();

        await userEvent.click(screen.getByRole('link', { name }));

        expect(router.state.location.search).toBe('?page=2');
        expect(scrollTo).not.toHaveBeenCalled();
      },
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPages(3, 2);

    expect(await axe(container)).toHaveNoViolations();
  });
});
