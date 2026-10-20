import { Field, Input, ToggleGroup, ToggleGroupItem } from '@shared/design-system';
import type { usePackageSheet } from '../../hooks/sheet/usePackageSheet';

type LimitsView = ReturnType<typeof usePackageSheet>['limits'];

/**
 * «الحدود»: the limits a package may set, as chips any number of which are on, then a field for
 * each one turned on, in the chips' order.
 */
export function LimitsField({ view }: { view: LimitsView }) {
  return (
    <div className="flex flex-col gap-3">
      <Field
        label={view.label}
        labelEnd={<span className="text-caption text-muted-foreground">{view.optional}</span>}
        helper={view.helper}
      >
        <ToggleGroup
          type="multiple"
          value={view.value}
          onValueChange={view.choose}
          disabled={view.disabled}
        >
          {view.options.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
      {view.fields.map((limit) => (
        <Field key={limit.name} label={limit.label} error={limit.error}>
          <Input dir="ltr" inputMode="numeric" autoComplete="off" {...limit.binding} />
        </Field>
      ))}
    </div>
  );
}
