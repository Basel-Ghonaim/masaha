import {
  Combobox,
  ComboboxContent,
  ComboboxGroup,
  ComboboxItem,
  ComboboxTrigger,
} from '@shared/design-system';
import type { Ref } from 'react';
import { useAreaOptions } from '../../hooks/area/useAreaOptions';
import type { LookupsSource } from '../../types/LookupsSource';

/**
 * The field that chooses one area for a space, searched by its name: each governorate a group named
 * after it, its areas under it, from the public catalogue, so only an area that may take a space is
 * offered; a search matches an area's name or its governorate's. Set inside a Field, which names it;
 * `ref` reaches its trigger, so a form can focus it. While the areas load, or once they have failed,
 * the list says so. A space's own area hidden since stays offered, first, as `AreaSelect` keeps it.
 */
export function AreaCombobox({
  source,
  value,
  onValueChange,
  disabled,
  ref,
}: {
  source: LookupsSource;
  value: number | null;
  onValueChange: (areaId: number) => void;
  disabled?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  const select = useAreaOptions({ source, value, onValueChange });
  const chosen =
    select.kept?.value === select.value
      ? select.kept.label
      : select.groups
          .flatMap((group) => group.options)
          .find((option) => option.value === select.value)?.label;

  return (
    <Combobox type="single" value={select.value} onValueChange={select.choose}>
      <ComboboxTrigger ref={ref} empty={chosen === undefined} disabled={disabled}>
        {chosen ?? select.placeholder}
      </ComboboxTrigger>
      <ComboboxContent
        searchLabel={select.search.label}
        searchPlaceholder={select.search.placeholder}
        listLabel={select.search.list}
        emptyText={select.status === 'error' ? select.failedLabel : select.search.empty}
        loading={select.status === 'loading' ? select.loadingLabel : undefined}
      >
        {select.kept !== null && (
          <ComboboxItem value={select.kept.value}>{select.kept.label}</ComboboxItem>
        )}
        {select.groups.map((group) => (
          <ComboboxGroup key={group.key} heading={group.label}>
            {group.options.map((option) => (
              <ComboboxItem key={option.value} value={option.value} keywords={[group.label]}>
                {option.label}
              </ComboboxItem>
            ))}
          </ComboboxGroup>
        ))}
      </ComboboxContent>
    </Combobox>
  );
}
