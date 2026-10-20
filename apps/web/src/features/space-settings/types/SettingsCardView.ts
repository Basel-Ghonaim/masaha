import type { FormFailureView } from '@shared/forms';
import type { BaseSyntheticEvent } from 'react';

/** A settings card's frame, ready to render: its title, its state, its save and its discard. */
export type SettingsCardView = {
  /** The card's anchor. */
  id: string;
  title: string;
  description?: string;
  /** «تغييرات غير محفوظة» while the fields differ from the saved settings. */
  unsaved: string | null;
  failure: FormFailureView | null;
  save: {
    label: string;
    pending: boolean;
    blocked: boolean;
    submit: (event?: BaseSyntheticEvent) => void;
  };
  /** Puts the fields back as saved, while they differ. */
  discard: { label: string; run: () => void } | null;
  /** «لم يتغيّر شيء» once a save found nothing to send. */
  note: string | null;
};
