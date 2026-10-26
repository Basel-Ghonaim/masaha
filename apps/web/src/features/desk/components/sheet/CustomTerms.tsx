import { Field, Input, Textarea, ToggleGroup, ToggleGroupItem } from '@shared/design-system';
import type { CustomTermsView } from '../../hooks/sheet/useSheetForm';

/** A single choice as chips, one always on, named by its label. */
function Chips({
  label,
  value,
  options,
  choose,
  disabled,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  choose: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <Field label={label}>
      <ToggleGroup type="single" value={value} onValueChange={choose} disabled={disabled}>
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}

/**
 * «مخصّص»'s terms (DI-52): the subscription's name, for whom, how it is billed and at what price or
 * rate, the four optional limits, the shift where the space has any, and why the price was typed.
 */
export function CustomTerms({ view, disabled }: { view: CustomTermsView; disabled: boolean }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 rounded-lg border border-border p-3">
      <legend className="px-1 text-label">{view.title}</legend>
      <Field label={view.name.label} error={view.name.error}>
        <Input dir="auto" autoComplete="off" aria-required {...view.name.field} />
      </Field>
      <Chips {...view.audience} disabled={disabled} />
      <Chips {...view.billing} disabled={disabled} />
      <Field label={view.price.label} error={view.price.error}>
        <Input
          dir="ltr"
          inputMode="decimal"
          autoComplete="off"
          aria-required
          {...view.price.field}
        />
      </Field>
      <div className="flex flex-col gap-2">
        <p className="text-label">{view.limits.label}</p>
        <div className="grid grid-cols-2 gap-3">
          {view.limits.items.map((limit) => (
            <Field key={limit.key} label={limit.label} error={limit.error}>
              <Input dir="ltr" inputMode="numeric" autoComplete="off" {...limit.field} />
            </Field>
          ))}
        </div>
      </div>
      {view.shift !== null && <Chips {...view.shift} disabled={disabled} />}
      <Field label={view.reason.label} error={view.reason.error}>
        <Textarea aria-required {...view.reason.field} />
      </Field>
    </fieldset>
  );
}
