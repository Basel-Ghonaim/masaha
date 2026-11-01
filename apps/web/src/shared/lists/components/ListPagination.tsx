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
import { Link, useLocation } from 'react-router';
import type { PaginationView } from '../types/PaginationView';

/** An address's search, in one spelling: with or without its `?`, and none at all, compare equal. */
function searchKey(search: string) {
  return new URLSearchParams(search).toString();
}

/**
 * A paged list's pages, each a link to its own address, so a page opens in a new tab and Back returns to
 * the page before. A step with no page to go to stays in place, unavailable. The page the address
 * asks for is marked current at once, before its answer arrives (finding 132), and the answer's
 * page when the address names none of them. Following a step keeps the scroll where it is: the
 * pages sit under the list, and the reader stays with it.
 */
export function ListPagination({ pagination }: { pagination: PaginationView }) {
  const { previous, next } = pagination;
  const here = searchKey(useLocation().search);
  const asked = pagination.items.find(
    (item) => item.kind === 'page' && searchKey(item.search) === here,
  );
  const isCurrent = (item: { page: number; current: boolean }) =>
    asked?.kind === 'page' ? item.page === asked.page : item.current;

  return (
    <Pagination label={pagination.label}>
      <PaginationContent>
        <PaginationItem>
          {previous.search === null ? (
            <PaginationPrevious disabled>{previous.label}</PaginationPrevious>
          ) : (
            <PaginationPrevious asChild>
              <Link to={{ search: previous.search }} preventScrollReset>
                {previous.label}
              </Link>
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
              <PaginationLink asChild isActive={isCurrent(item)}>
                <Link to={{ search: item.search }} preventScrollReset aria-label={item.label}>
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
              <Link to={{ search: next.search }} preventScrollReset>
                {next.label}
              </Link>
            </PaginationNext>
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
