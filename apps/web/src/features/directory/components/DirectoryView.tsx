import { useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useDirectoryMap } from '../hooks/map/useDirectoryMap';
import { filtersOf } from '../services/filtersOf';
import type { DirectorySlots } from '../types/DirectorySlots';
import { DirectoryList } from './DirectoryList';
import { FiltersForm } from './filters/FiltersForm';
import { FiltersSheet } from './filters/FiltersSheet';
import { DirectoryMap } from './map/DirectoryMap';
import { LocationStatus } from './near/LocationStatus';
import { NearMeButton } from './near/NearMeButton';
import { DirectorySearch } from './search/DirectorySearch';

/**
 * The directory, as the address asks: the list a page at a time, or the map of every pin. The page
 * sets the links to the spaces, the areas' names and the place filter.
 */
export function DirectoryView(slots: DirectorySlots) {
  const [params] = useSearchParams();
  return filtersOf(params).view === 'map' ? (
    <MapView slots={slots} />
  ) : (
    <DirectoryList {...slots} />
  );
}

/**
 * The map's view: the search and the filters' sheet (at every width, with no order), «الأقرب إليّ»
 * and its state line, then the map.
 */
function MapView({ slots }: { slots: DirectorySlots }) {
  const view = useDirectoryMap();
  const nearButton = useRef<HTMLButtonElement>(null);
  const { filters } = view;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <DirectorySearch search={view.search} />
        <div className="flex items-end gap-3">
          <FiltersSheet sheet={filters.sheet}>
            <FiltersForm
              filters={filters}
              place={slots.placeFilter(filters.place.value, filters.place.change)}
            />
          </FiltersSheet>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex justify-end">
          <NearMeButton ref={nearButton} button={view.near.button} />
        </div>
        <LocationStatus
          view={view.near.status}
          returnFocus={() => {
            nearButton.current?.focus();
          }}
        />
      </div>
      <DirectoryMap view={view} slots={slots} />
    </div>
  );
}
