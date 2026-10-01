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
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type PaginationSamples = {
  title: string;
  caption: string;
  label: string;
  previous: string;
  next: string;
  more: string;
  /** "Page {page} of {total}" */
  summary: string;
  pageCaptions: string[];
};

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

function Pages({ page, samples }: { page: number; samples: PaginationSamples }) {
  return (
    <Pagination label={samples.label}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" disabled={page === 1}>
            {samples.previous}
          </PaginationPrevious>
        </PaginationItem>
        {pageList(page).map((entry) => (
          <PaginationItem key={entry}>
            {typeof entry === 'number' ? (
              <PaginationLink href="#" isActive={entry === page}>
                {entry}
              </PaginationLink>
            ) : (
              <PaginationEllipsis label={samples.more} />
            )}
          </PaginationItem>
        ))}
        <PaginationSummary>
          {samples.summary.replace('{page}', String(page)).replace('{total}', String(TOTAL))}
        </PaginationSummary>
        <PaginationItem>
          <PaginationNext href="#" disabled={page === TOTAL}>
            {samples.next}
          </PaginationNext>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export function PaginationSection({ samples }: { samples: PaginationSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <p className="text-caption text-muted-foreground">{samples.caption}</p>
      {[1, 3, TOTAL].map((page, index) => (
        <ShowcaseGroup key={page} caption={samples.pageCaptions[index] ?? ''}>
          <Pages page={page} samples={samples} />
        </ShowcaseGroup>
      ))}
    </ShowcaseSection>
  );
}
