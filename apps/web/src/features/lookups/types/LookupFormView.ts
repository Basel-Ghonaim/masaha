import type { FormFailureView } from '@shared/forms';
import type { BaseSyntheticEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { PositionFieldView } from './PositionFieldView';

/** The names a governorate or an area is given, in the order the sheet shows them. */
export type LookupNameField = 'nameAr' | 'nameEn';

/**
 * A governorate's or an area's form in the sheet, ready to render: its two names, and when editing
 * a row of a list of more than ten its position, with their labels, errors and states. Whether it
 * is shown is its row's switch alone.
 */
export type LookupFormView = {
  field: (name: LookupNameField) => UseFormRegisterReturn & { disabled: boolean };
  /** The form's `onSubmit`. */
  submit: (event?: BaseSyntheticEvent) => void;
  isPending: boolean;
  blocked: boolean;
  errors: Partial<Record<LookupNameField, string>>;
  failure: FormFailureView | null;
  labels: { nameAr: string; nameEn: string; save: string };
  position?: PositionFieldView;
};
