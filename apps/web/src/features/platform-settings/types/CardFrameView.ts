import type { FormFailureView } from '@shared/forms';
import type { BaseSyntheticEvent } from 'react';

/** An admin's settings card once read: its head, its state, its save and its discard. */
export type CardFrameView = {
  /** The card's anchor. */
  id: string;
  title: string;
  description: string;
  /** «تغييرات غير محفوظة» while the fields differ from the saved values. */
  unsaved: string | null;
  /** A refusal of the save, inside its card (the 429's count included). */
  failure: FormFailureView | null;
  save: {
    label: string;
    pending: boolean;
    blocked: boolean;
    submit: (event?: BaseSyntheticEvent) => void;
  };
  /** «تجاهل التغييرات»: the fields put back as saved, while they differ. */
  discard: { label: string; run: () => void } | null;
};
