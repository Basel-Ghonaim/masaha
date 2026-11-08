import { Field, Input, SegmentedControl, SegmentedControlItem } from '@shared/design-system';
import { useId } from 'react';
import type { PriceFilterView } from '../../types/FiltersView';

/**
 * The price filter, a group named «السعر»: the subscription as one segmented choice, «الكل · ساعة ·
 * يوم · أسبوع · شهر», named «نوع الاشتراك»; once one is chosen, «من» and «إلى» side by side in whole
 * shekels, each with its hint and its line; and the line under them, the hint under «الكل» or the
 * help line, which describes the subscription.
 */
export function PriceFilter({ price }: { price: PriceFilterView }) {
  const labelId = useId();
  const lineId = useId();
  const { subscription, range } = price;

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-3">
      <p id={labelId} className="text-label">
        {price.label}
      </p>
      <SegmentedControl
        aria-label={subscription.label}
        aria-describedby={lineId}
        value={subscription.value}
        onValueChange={subscription.choose}
      >
        {subscription.options.map((option) => (
          <SegmentedControlItem key={option.value} value={option.value}>
            {option.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      {range !== null && (
        <div className="grid grid-cols-2 gap-3">
          {[range.min, range.max].map((bound) => (
            <Field key={bound.label} label={bound.label} error={bound.error}>
              <Input
                dir="ltr"
                inputMode="numeric"
                autoComplete="off"
                startIcon={range.currency}
                placeholder={bound.placeholder}
                value={bound.text}
                onChange={(event) => {
                  bound.change(event.target.value);
                }}
              />
            </Field>
          ))}
        </div>
      )}
      <p id={lineId} className="text-caption text-muted-foreground">
        {price.line}
      </p>
    </div>
  );
}
