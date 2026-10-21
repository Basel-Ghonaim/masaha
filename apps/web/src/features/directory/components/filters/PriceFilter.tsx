import { Field, Input, ToggleGroup, ToggleGroupItem } from '@shared/design-system';
import { useId } from 'react';
import type { PriceFilterView } from '../../types/FiltersView';

/**
 * The price filter, a group named «السعر»: the period's four chips two by two (design issue 10),
 * then «من» and «إلى» side by side in whole shekels, each with its line, and the help line naming
 * the period.
 */
export function PriceFilter({ price }: { price: PriceFilterView }) {
  const labelId = useId();

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-3">
      <p id={labelId} className="text-label">
        {price.label}
      </p>
      <Field label={price.period.label}>
        <ToggleGroup
          type="single"
          value={price.period.value}
          onValueChange={price.period.choose}
          className="grid grid-cols-2"
        >
          {price.period.options.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {[price.min, price.max].map((bound) => (
          <Field key={bound.label} label={bound.label} error={bound.error}>
            <Input
              dir="ltr"
              inputMode="numeric"
              startIcon={price.currency}
              value={bound.text}
              onChange={(event) => {
                bound.change(event.target.value);
              }}
            />
          </Field>
        ))}
      </div>
      <p className="text-caption text-muted-foreground">{price.help}</p>
    </div>
  );
}
