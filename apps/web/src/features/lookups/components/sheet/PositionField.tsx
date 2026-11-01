import { Field, Input } from '@shared/design-system';
import type { PositionFieldView } from '../../types/PositionFieldView';

/** A row's position in its sheet: a whole number, typed in Western or Arabic-Indic digits. */
export function PositionField({ position }: { position: PositionFieldView }) {
  return (
    <Field label={position.label} helper={position.helper} error={position.error}>
      <Input inputMode="numeric" dir="ltr" autoComplete="off" {...position.binding} />
    </Field>
  );
}
