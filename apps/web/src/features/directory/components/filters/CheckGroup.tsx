import { Checkbox, Field } from '@shared/design-system';
import { useId } from 'react';
import type { CheckGroupView } from '../../types/FiltersView';

/** A group named by its heading, each of its checkboxes a horizontal Field of its own. */
export function CheckGroup({ group }: { group: CheckGroupView }) {
  const labelId = useId();

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-3">
      <p id={labelId} className="text-label">
        {group.label}
      </p>
      {group.items.map((item) => (
        <Field key={item.key} orientation="horizontal" label={item.label}>
          <Checkbox
            checked={item.checked}
            onCheckedChange={(checked) => {
              item.toggle(checked === true);
            }}
          />
        </Field>
      ))}
    </div>
  );
}
