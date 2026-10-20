import { Field, ToggleGroup, ToggleGroupItem } from '@shared/design-system';
import type { ReactNode } from 'react';

/** A single choice of the sheet as chips, one always on, named by its field's label. */
export function ChipsField({
  label,
  value,
  options,
  disabled,
  choose,
  error,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  disabled: boolean;
  choose: (value: string) => void;
  error?: ReactNode;
}) {
  return (
    <Field label={label} error={error}>
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
