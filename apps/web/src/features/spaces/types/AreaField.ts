import type { ReactNode, Ref } from 'react';

/** What the area field receives from the form that sets it. */
export type AreaFieldProps = {
  /** The area chosen, by its id, or none. */
  value: number | null;
  onValueChange: (areaId: number) => void;
  /** While the form is sent. */
  disabled: boolean;
  /** Reaches the field's control, so a refusal can focus it. */
  ref: Ref<HTMLButtonElement>;
};

/**
 * The area field, which the page fills from another capability (`lookups`), rendered inside the
 * form's Field, which names it.
 */
export type AreaField = (props: AreaFieldProps) => ReactNode;
