import {
  Field,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/design-system';

/** «الشهر»: the current Gaza month and the 23 before it, newest first; a choice applies at once. */
export function MonthField({
  month,
}: {
  month: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    choose: (value: string) => void;
  };
}) {
  return (
    <Field label={month.label} className="md:w-48">
      <Select value={month.value} onValueChange={month.choose}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {month.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
