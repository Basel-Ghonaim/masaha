import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationSummary,
} from '@shared/design-system';
import { Link } from 'react-router';
import type { AdminSpacesListView } from '../../types/AdminSpacesListView';

/**
 * The list's pages, each a link to its own address, so a page opens in a new tab and Back returns to
 * the page before. A step with no page to go to stays in place, unavailable.
 */
export function AdminSpacesPagination({
  pagination,
}: {
  pagination: NonNullable<AdminSpacesListView['pagination']>;
}) {
  const { previous, next } = pagination;

  return (
    <Pagination label={pagination.label}>
      <PaginationContent>
        <PaginationItem>
          {previous.search === null ? (
            <PaginationPrevious disabled>{previous.label}</PaginationPrevious>
          ) : (
            <PaginationPrevious asChild>
              <Link to={{ search: previous.search }}>{previous.label}</Link>
            </PaginationPrevious>
          )}
        </PaginationItem>
        {pagination.items.map((item) =>
          item.kind === 'gap' ? (
            <PaginationItem key={item.key}>
              <PaginationEllipsis label={pagination.more} />
            </PaginationItem>
          ) : (
            <PaginationItem key={item.page}>
              <PaginationLink asChild isActive={item.current}>
                <Link to={{ search: item.search }} aria-label={item.label}>
                  {item.page}
                </Link>
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationSummary>{pagination.summary}</PaginationSummary>
        <PaginationItem>
          {next.search === null ? (
            <PaginationNext disabled>{next.label}</PaginationNext>
          ) : (
            <PaginationNext asChild>
              <Link to={{ search: next.search }}>{next.label}</Link>
            </PaginationNext>
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
