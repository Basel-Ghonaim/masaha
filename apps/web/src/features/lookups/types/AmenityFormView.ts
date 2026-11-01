import type { AmenityIconKey } from '@masaha/shared/lookups';
import type { FormFailureView } from '@shared/forms';
import type { BaseSyntheticEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { LookupNameField } from './LookupFormView';
import type { PositionFieldView } from './PositionFieldView';

/**
 * An amenity's form in the sheet, ready to render: its two names, its icon chosen from a grid, and
 * when editing an amenity of a list of more than ten its position, with their labels, errors and
 * states. Its key is never shown: the server derives it; whether it is offered is its row's switch.
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
  position?: PositionFieldView;
};
