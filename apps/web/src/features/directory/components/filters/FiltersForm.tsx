import { Field, Switch, ToggleGroup, ToggleGroupItem } from '@shared/design-system';
import { useId, type ReactNode } from 'react';
import type { FiltersView } from '../../types/FiltersView';
import { PriceFilter } from './PriceFilter';

/**
 * The filters themselves, the same in the sidebar and the sheet: the place (the page's slot), the
 * two switches in a group «المساحات» with its note, the price, and «أخرى».
 */
export function FiltersForm({ filters, place }: { filters: FiltersView; place: ReactNode }) {
  const spacesId = useId();
  const { spaces, others } = filters;

  return (
    <div className="flex flex-col gap-6">
      {place}
      <div role="group" aria-labelledby={spacesId} className="flex flex-col gap-3">
        <p id={spacesId} className="text-label">
          {spaces.label}
        </p>
        {[spaces.availableNow, spaces.verified].map((item) => (
          <Field key={item.label} orientation="horizontal" label={item.label}>
            <Switch checked={item.checked} onCheckedChange={item.toggle} />
          </Field>
        ))}
        <p className="text-caption text-muted-foreground">{spaces.note}</p>
      </div>
      <PriceFilter price={filters.price} />
      <Field label={others.label}>
        <ToggleGroup type="multiple" value={others.value} onValueChange={others.change}>
          {others.options.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
    </div>
  );
}
