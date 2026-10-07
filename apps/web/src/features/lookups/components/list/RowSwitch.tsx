import { Switch } from '@shared/design-system';
import { useId, type Ref } from 'react';
import type { SwitchControl } from '../../types/RowControlsView';

/**
 * One switch of a row, named after its row, and followed by its words when it has some, which turn
 * it too. While it waits on the server it stays in the focus order; `onToggle` decides whether a
 * press counts.
 */
export function RowSwitch({
  control,
  onToggle,
  ref,
}: {
  control: SwitchControl;
  onToggle: (checked: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  const id = useId();
  const toggle = (
    <Switch
      ref={ref}
      id={control.text === undefined ? undefined : id}
      className="mx-2"
      checked={control.checked}
      aria-label={control.label}
      aria-disabled={control.waiting || undefined}
      onCheckedChange={onToggle}
    />
  );
  if (control.text === undefined) return toggle;

  return (
    <span className="flex items-center">
      {toggle}
      <label htmlFor={id} className="text-label text-foreground">
        {control.text}
      </label>
    </span>
  );
}
