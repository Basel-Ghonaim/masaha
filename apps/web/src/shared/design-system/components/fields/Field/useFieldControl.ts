import { createContext, useContext, type AriaAttributes } from 'react';

export type FieldContextValue = {
  /** The id the label points at. */
  controlId: string;
  /** The label's own id, for a group that is named by reference rather than by `for`. */
  labelId: string;
  /** The ids of the error and helper text, error first, or undefined when there is neither. */
  describedBy: string | undefined;
  invalid: boolean;
};

export const FieldContext = createContext<FieldContextValue | null>(null);

type FieldControlProps = {
  id?: string | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
};

function joinIds(...ids: (string | undefined)[]) {
  const joined = ids.filter(Boolean).join(' ');
  return joined === '' ? undefined : joined;
}

/** The Field around a control, or null when it has none. */
export function useField() {
  return useContext(FieldContext);
}

/**
 * The attributes that tie a control to the Field around it: the id its label points at, the error
 * and helper text that describe it, and its invalid state. Inside a Field the Field owns the id,
 * since its label points at it; descriptions add up, and an invalid state the control is given wins.
 * Outside a Field the control keeps only what it was given.
 */
export function useFieldControl({
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: FieldControlProps) {
  const field = useField();
  return {
    id: field?.controlId ?? id,
    'aria-describedby': joinIds(field?.describedBy, describedBy),
    'aria-invalid': invalid ?? (field?.invalid === true ? true : undefined),
  };
}
