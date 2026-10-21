import { ListPagination } from '@shared/lists';
import { useDirectoryList } from '../hooks/list/useDirectoryList';
import type { DirectorySlots } from '../types/DirectorySlots';
import { DirectoryResults } from './list/DirectoryResults';
import { DirectorySearch } from './search/DirectorySearch';
import { SortSelect } from './sort/SortSelect';

/**
 * The directory's list: the search and the order (one row from a tablet up), the count, the cards a
 * page at a time, and the pages. The page sets the links to the spaces and the areas' names.
 */
export function DirectoryList(slots: DirectorySlots) {
  const list = useDirectoryList();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <DirectorySearch search={list.search} />
        <SortSelect sort={list.sort} />
      </div>
      <p aria-live="polite" className="text-body-sm text-muted-foreground">
        {list.count}
      </p>
      <DirectoryResults
        results={list.results}
        page={list.page}
        slots={slots}
        pagination={list.pagination !== null && <ListPagination pagination={list.pagination} />}
      />
    </div>
  );
}
