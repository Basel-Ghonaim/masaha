import {
  Field,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/design-system';
import type { DirectoryListView } from '../../types/DirectoryListView';

/** The list's order: its trigger named «الترتيب» and showing the order chosen. */
export function SortSelect({ sort }: { sort: DirectoryListView['sort'] }) {
  return (
    <Field label={<span className="sr-only">{sort.label}</span>} className="w-full md:w-60">
      <Select value={sort.value} onValueChange={sort.choose}>
        <SelectTrigger>
          <SelectValue>{sort.valueText}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sort.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
