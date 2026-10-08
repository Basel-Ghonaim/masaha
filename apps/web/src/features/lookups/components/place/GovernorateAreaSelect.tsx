import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/design-system';
import { useGovernorateAreaOptions } from '../../hooks/place/useGovernorateAreaOptions';
import type { PlaceValue } from '../../types/PlaceValue';

/**
 * The one field that chooses a governorate or one of its areas: "All areas", then each governorate
 * with its areas under it, indented, each governorate's options a group named after it. Set inside a
 * Field, which names it. While the places load, or once they have failed, one option says so.
 */
export function GovernorateAreaSelect(props: {
  value: PlaceValue;
  onValueChange: (value: PlaceValue) => void;
}) {
  const select = useGovernorateAreaOptions(props);

  return (
    <Select value={select.value} onValueChange={select.choose}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={select.all.value}>{select.all.label}</SelectItem>
        {select.status === 'loading' && (
          <SelectItem value="loading" disabled>
            {select.loadingLabel}
          </SelectItem>
        )}
        {select.status === 'error' && (
          <SelectItem value="failed" disabled>
            {select.failedLabel}
          </SelectItem>
        )}
        {select.groups.map((group) => (
          <SelectGroup key={group.key} aria-label={group.label}>
            {group.options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className={option.area ? 'ps-6' : undefined}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
