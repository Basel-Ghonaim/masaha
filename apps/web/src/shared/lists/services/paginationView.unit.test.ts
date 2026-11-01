import { describe, expect, it } from 'vitest';
import { paginationView } from './paginationView';

const words = {
  label: 'Pages',
  more: 'More pages',
  previous: 'Previous',
  next: 'Next',
  page: ({ page }: { page: number }) => `Page ${String(page)}`,
  summary: ({ page, total }: { page: number; total: number }) =>
    `Page ${String(page)} of ${String(total)}`,
};
const searchOf = (page: number) => `?page=${String(page)}`;

describe('paginationView', () => {
  it('keeps a one-page list its steps, with no page before or after', () => {
    const view = paginationView({ current: 1, total: 1, words, searchOf });

    expect(view?.previous.search).toBeNull();
    expect(view?.next.search).toBeNull();
    expect(view?.items).toEqual([
      { kind: 'page', page: 1, label: 'Page 1', search: '?page=1', current: true },
    ]);
  });

  it('gives a list with no page no steps', () => {
    expect(paginationView({ current: 1, total: 0, words, searchOf })).toBeNull();
  });

  it('gives a list that shows its steps only past one page none for one page', () => {
    expect(paginationView({ current: 1, total: 1, words, searchOf, onlyPastOne: true })).toBeNull();
    expect(
      paginationView({ current: 1, total: 2, words, searchOf, onlyPastOne: true }),
    ).not.toBeNull();
  });
});
