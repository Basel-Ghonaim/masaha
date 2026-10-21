import { ListPagination } from '@shared/lists';
import { useDirectoryList } from '../hooks/list/useDirectoryList';
import type { DirectorySlots } from '../types/DirectorySlots';
import { FiltersForm } from './filters/FiltersForm';
import { FiltersSheet } from './filters/FiltersSheet';
import { FiltersSidebar } from './filters/FiltersSidebar';
import { DirectoryResults } from './list/DirectoryResults';
import { DirectorySearch } from './search/DirectorySearch';
import { SortSelect } from './sort/SortSelect';

/**
 * The directory's list: the search, the filters' button below 1024 px and the order (one row from a
 * tablet up), the count, then the filters' sidebar from 1024 px beside the cards a page at a time,
 * and the pages. The filters are drawn once, in the sheet or the sidebar. The page sets the links to
 * the spaces, the areas' names and the place filter.
 */
export function DirectoryList(slots: DirectorySlots) {
  const list = useDirectoryList();
  const { filters } = list;
  const form = (
    <FiltersForm
      filters={filters}
      place={slots.placeFilter(filters.place.value, filters.place.change)}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <DirectorySearch search={list.search} />
        <div className="flex items-end gap-3">
          {!filters.wide && <FiltersSheet sheet={filters.sheet}>{form}</FiltersSheet>}
          <SortSelect sort={list.sort} />
        </div>
      </div>
      <p aria-live="polite" className="text-body-sm text-muted-foreground">
        {list.count}
      </p>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
        {filters.wide && <FiltersSidebar sidebar={filters.sidebar}>{form}</FiltersSidebar>}
        <div className="lg:col-span-9">
          <DirectoryResults
            results={list.results}
            page={list.page}
            slots={slots}
            pagination={list.pagination !== null && <ListPagination pagination={list.pagination} />}
          />
        </div>
      </div>
    </div>
  );
}
