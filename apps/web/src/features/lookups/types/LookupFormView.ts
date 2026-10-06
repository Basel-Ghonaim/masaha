import type { FormFailureView } from '@shared/forms';
import type { BaseSyntheticEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

/** The names a governorate or an area is given, in the order the sheet shows them. */
export type LookupNameField = 'nameAr' | 'nameEn';

/**
 * A governorate's or an area's form in the sheet, ready to render: its two names, and when editing
 * its Active switch (a new one is always active), with their labels, errors and states.
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
  active?: {
    label: string;
    hint: string;
    checked: boolean;
    disabled: boolean;
    toggle: (checked: boolean) => void;
  };
};
