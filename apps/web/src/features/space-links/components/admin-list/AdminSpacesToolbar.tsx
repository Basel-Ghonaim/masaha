import { Field, Input, SearchIcon } from '@shared/design-system';
import { SPACE_NAME_MAX_LENGTH } from '@masaha/shared/spaces';
import type { AdminSpacesListView } from '../../types/AdminSpacesListView';
import type { PlaceField } from '../../types/PlaceField';
import { FilterFields } from './FilterFields';
import { FiltersSheet } from './FiltersSheet';

/**
 * The search and the filters above the list. From 768 px they stand in one row; on a phone the search
 * stays in view and the other filters move into a sheet.
 */
export function AdminSpacesToolbar({
  filters,
  placeField,
}: {
  filters: AdminSpacesListView['filters'];
  placeField: PlaceField;
}) {
  return (
    <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
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
  );
}
