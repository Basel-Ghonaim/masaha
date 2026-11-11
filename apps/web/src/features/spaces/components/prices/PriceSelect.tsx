import {
  Field,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/design-system';
import type { Ref } from 'react';

/**
 * A row's select, its label shown on a phone, or said only where a column heads it (`hidden`), its
 * options each in its own language; `ref` reaches its trigger, so a refusal can focus it.
 */
export function PriceSelect({
  name,
  hidden,
  value,
  options,
  disabled,
  choose,
  error,
  ref,
}: {
  name: string;
  hidden: boolean;
  value: string;
  options: { value: string; label: string; lang?: 'ar' | 'en' }[];
  disabled: boolean;
  choose: (option: string) => void;
  error?: string;
  ref: Ref<HTMLButtonElement>;
}) {
  return (
    <Field label={hidden ? <span className="sr-only">{name}</span> : name} error={error}>
      <Select value={value} onValueChange={choose} disabled={disabled}>
        <SelectTrigger ref={ref}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span lang={option.lang}>{option.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
