import {
  Field,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/design-system';
import type { TimeChoice } from '../../services/timeOptions';

/** A time chosen from its half-hour list (W5), left to right, in its Field. */
export function TimeSelect({ time, error }: { time: TimeChoice; error?: string }) {
  return (
    <Field label={time.label} error={error}>
      <Select value={time.value} onValueChange={time.choose} disabled={time.disabled}>
        <SelectTrigger dir="ltr">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {time.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span dir="ltr">{option.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
