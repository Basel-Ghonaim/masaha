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
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

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

function Pages({ page, samples }: { page: number; samples: PaginationSamples }) {
  // Three page numbers around the current one, then the last page.
  const first = Math.min(Math.max(page - 1, 1), TOTAL - 3);
  const numbers = [first, first + 1, first + 2];

  return (
    <Pagination label={samples.label}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" disabled={page === 1}>
            {samples.previous}
          </PaginationPrevious>
        </PaginationItem>
        {numbers.map((number) => (
          <PaginationItem key={number}>
            <PaginationLink href="#" isActive={number === page}>
              {number}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationEllipsis label={samples.more} />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive={page === TOTAL}>
            {TOTAL}
          </PaginationLink>
        </PaginationItem>
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
