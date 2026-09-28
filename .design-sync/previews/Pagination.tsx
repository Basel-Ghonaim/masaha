import './_document';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationSummary,
} from '@masaha/design-system';

// Ported from the showcase's PaginationSection
// (apps/web/src/pages/showcase/sections/PaginationSection.tsx).

const TOTAL = 5;

/**
 * Three page numbers around the current one, with the first and last pages always in reach. An
 * ellipsis stands only where pages are skipped: `1 2 3 … 5`, `1 2 3 4 5`, `1 … 3 4 5`.
 */
function pageList(page: number): (number | 'before' | 'after')[] {
  const start = Math.min(Math.max(page - 1, 1), TOTAL - 2);
  const end = start + 2;
  return [
    ...(start > 1 ? [1] : []),
    ...(start > 2 ? (['before'] as const) : []),
    start,
    start + 1,
    end,
    ...(end < TOTAL - 1 ? (['after'] as const) : []),
    ...(end < TOTAL ? [TOTAL] : []),
  ];
}

function Pages({ page }: { page: number }) {
  return (
    <Pagination label="صفحات قائمة المشتركين">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" disabled={page === 1}>
            السابقة
          </PaginationPrevious>
        </PaginationItem>
        {pageList(page).map((entry) => (
          <PaginationItem key={entry}>
            {typeof entry === 'number' ? (
              <PaginationLink href="#" isActive={entry === page}>
                {entry}
              </PaginationLink>
            ) : (
              <PaginationEllipsis label="أرقام صفحات محذوفة" />
            )}
          </PaginationItem>
        ))}
        <PaginationSummary>{`صفحة ${page} من ${TOTAL}`}</PaginationSummary>
        <PaginationItem>
          <PaginationNext href="#" disabled={page === TOTAL}>
            التالية
          </PaginationNext>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

/** On the first page: «السابقة» is disabled. */
export function FirstPage() {
  return <Pages page={1} />;
}

/** On a middle page. */
export function MiddlePage() {
  return <Pages page={3} />;
}

/** On the last page: «التالية» is disabled. */
export function LastPage() {
  return <Pages page={TOTAL} />;
}
