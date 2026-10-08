import {
  Field,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@shared/design-system';
import type { AdminSpacesListView } from '../../types/AdminSpacesListView';
import type { PlaceField } from '../../types/PlaceField';

/**
 * The filters beside the search: the place, from the field the page hands in, the state and stale
 * only. Each applies at once. Above the table they stand in a row; on a phone, in the filters' sheet.
 */
export function FilterFields({
  filters,
  placeField,
}: {
  filters: AdminSpacesListView['filters'];
  placeField: PlaceField;
}) {
  return (
    <>
      <Field label={filters.place.label}>
        {placeField({ value: filters.place.value, onChange: filters.place.choose })}
      </Field>
      <Field label={filters.status.label}>
        <Select value={filters.status.value} onValueChange={filters.status.choose}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filters.status.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={filters.stale.label} orientation="horizontal" className="self-end">
        <Switch checked={filters.stale.checked} onCheckedChange={filters.stale.toggle} />
      </Field>
    </>
  );
}
