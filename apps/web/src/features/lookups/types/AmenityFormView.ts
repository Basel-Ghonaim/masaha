import type { AmenityIconKey } from '@masaha/shared/lookups';
import type { FormFailureView } from '@shared/forms';
import type { BaseSyntheticEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { LookupNameField } from './LookupFormView';

/** One of a sheet's switches, ready to render: its label, its hint and its state. */
type SwitchFieldView = {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  toggle: (checked: boolean) => void;
};

/**
 * An amenity's form in the sheet, ready to render: its two names, its icon chosen from a grid, its
 * filter switch, and when editing its Active switch (a new one is always active), with their labels,
 * errors and states. Its key is never shown: the server derives it.
 */
export type AmenityFormView = {
  field: (name: LookupNameField) => UseFormRegisterReturn & { disabled: boolean };
  /** The form's `onSubmit`. */
  submit: (event?: BaseSyntheticEvent) => void;
  isPending: boolean;
  blocked: boolean;
  errors: Partial<Record<LookupNameField | 'icon', string>>;
  failure: FormFailureView | null;
  labels: { nameAr: string; nameEn: string; save: string };
  icon: {
    label: string;
    /** The icon chosen, or '' while none is. */
    value: string;
    options: { value: AmenityIconKey; label: string }[];
    disabled: boolean;
    /** For the first option, which takes the focus when no icon is chosen. */
    ref: (element: HTMLButtonElement | null) => void;
    choose: (value: string) => void;
  };
  filter: SwitchFieldView;
  active?: SwitchFieldView;
};
