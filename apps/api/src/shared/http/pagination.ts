import type { PaginationMeta, PaginationQuery } from '@masaha/shared';

/** The rows to skip for a page (docs/backend/conventions.md §5). */
export function toSkip({ page, limit }: PaginationQuery): number {
  return (page - 1) * limit;
}

export function buildPaginationMeta(
  { page, limit }: PaginationQuery,
  totalRecords: number,
): PaginationMeta {
  const totalPages = Math.ceil(totalRecords / limit);
  return {
    currentPage: page,
    limit,
    totalPages,
    totalRecords,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
