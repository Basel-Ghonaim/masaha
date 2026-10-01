import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationSummary,
} from '.';
import { DirectionProvider } from '../../lib/DirectionProvider';

const MIRRORED = '-scale-x-100';

function MembersPages({ page = 1 }: { page?: number }) {
  return (
    <Pagination label="Pages of the members list">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href={`?page=${String(page - 1)}`} disabled={page === 1}>
            Previous
          </PaginationPrevious>
        </PaginationItem>
        {[1, 2, 3].map((number) => (
          <PaginationItem key={number}>
            <PaginationLink href={`?page=${String(number)}`} isActive={number === page}>
              {number}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationEllipsis label="More pages" />
        </PaginationItem>
        <PaginationSummary>Page {page} of 5</PaginationSummary>
        <PaginationItem>
          <PaginationNext href={`?page=${String(page + 1)}`} disabled={page === 5}>
            Next
          </PaginationNext>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

describe('Pagination', () => {
  it('is a navigation named by its label, marking the current page', () => {
    render(<MembersPages page={2} />);
    const nav = screen.getByRole('navigation', { name: 'Pages of the members list' });

    expect(within(nav).getByRole('link', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: '1' })).not.toHaveAttribute('aria-current');
    expect(within(nav).getByRole('link', { name: 'Next' })).toHaveAttribute('href', '?page=3');
  });

  it('marks Previous unavailable on the first page, so it cannot be followed', () => {
    render(<MembersPages page={1} />);
    const previous = screen.getByRole('link', { name: 'Previous' });

    expect(previous).toHaveAttribute('aria-disabled', 'true');
    expect(previous).not.toHaveAttribute('href');
  });

  it('names the left-out pages with its label', () => {
    render(<MembersPages />);

    expect(screen.getByText('More pages')).toBeInTheDocument();
  });

  it.each([
    { dir: 'ltr' as const, mirrored: false },
    { dir: 'rtl' as const, mirrored: true },
  ])('points its chevrons along the reading direction in $dir', ({ dir, mirrored }) => {
    render(
      <DirectionProvider dir={dir}>
        <MembersPages page={2} />
      </DirectionProvider>,
    );

    for (const name of ['Previous', 'Next']) {
      const chevron = screen.getByRole('link', { name }).querySelector('svg');
      expect(chevron?.classList.contains(MIRRORED)).toBe(mirrored);
    }
  });

  it('renders a router link in place of its own with asChild', () => {
    render(
      <PaginationNext asChild>
        <a href="/members?page=2" data-router-link="">
          Next
        </a>
      </PaginationNext>,
    );
    const link = screen.getByRole('link', { name: 'Next' });

    expect(link).toHaveAttribute('data-router-link');
    expect(link.querySelector('svg')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<MembersPages page={1} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
