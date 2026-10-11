import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@shared/design-system';
import type { Ref } from 'react';
import { useAreaOptions } from '../../hooks/area/useAreaOptions';

/**
 * The field that chooses one area for a space: each governorate a group named after it, with its
 * areas, from the public catalogue, so only an area that may take a space is offered. Set inside a
 * Field, which names it; `ref` reaches its trigger, so a form can focus it. While the areas load,
 * or once they have failed, one option says so.
 */
export function AreaSelect({
  value,
  onValueChange,
  disabled,
  ref,
}: {
  value: number | null;
  onValueChange: (areaId: number) => void;
  disabled?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  const select = useAreaOptions({ value, onValueChange });

  return (
    <Select value={select.value} onValueChange={select.choose} disabled={disabled}>
      <SelectTrigger ref={ref}>
        <SelectValue placeholder={select.placeholder} />
      </SelectTrigger>
      <SelectContent>
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
          <SelectGroup key={group.key}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
