import { Field, Input, SearchIcon, ToggleGroup, ToggleGroupItem } from '@shared/design-system';
import { SPACE_NAME_MAX_LENGTH } from '@masaha/shared/spaces';
import type { AdminSpacesListView } from '../../types/AdminSpacesListView';
import type { PlaceField } from '../../types/PlaceField';
import { FilterFields } from './FilterFields';
import { FiltersSheet } from './FiltersSheet';

// The one chip of the quick filter, as `ToggleGroup` values name it.
const STALE = 'stale';

/**
 * The search and the filters above the list. From 768 px they stand in one row; on a phone the search
 * stays in view and the other filters move into a sheet. Under them the count the filters keep and
 * the stale-or-missing chip: a filter is a chip, not a field (the owner's A7).
 */
export function AdminSpacesToolbar({
  filters,
  placeField,
  count,
}: {
  filters: AdminSpacesListView['filters'];
  placeField: PlaceField;
  /** The count the filters keep, said once loading has settled. */
  count: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label={filters.search.label}>
          <Input
            type="search"
            placeholder={filters.search.placeholder}
            startIcon={<SearchIcon />}
            maxLength={SPACE_NAME_MAX_LENGTH}
            value={filters.search.text}
            onChange={(event) => {
              filters.search.change(event.target.value);
            }}
          />
        </Field>
        <div className="hidden md:contents">
          <FilterFields filters={filters} placeField={placeField} />
        </div>
        <div className="md:hidden">
          <FiltersSheet filters={filters} placeField={placeField} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {count !== undefined && (
          <p className="text-body-sm text-muted-foreground" aria-live="polite">
            {count}
          </p>
        )}
        <ToggleGroup
          type="multiple"
          value={filters.stale.checked ? [STALE] : []}
          onValueChange={(value) => {
            filters.stale.toggle(value.includes(STALE));
          }}
          aria-label={filters.quickFilter}
        >
          <ToggleGroupItem value={STALE}>{filters.stale.label}</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
