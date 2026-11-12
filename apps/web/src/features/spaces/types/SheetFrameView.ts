import type { FormFailureView } from '@shared/forms';
import type { BaseSyntheticEvent } from 'react';

/**
 * A section's Sheet, ready to render around its fields (G1): open or not, its title, its save and
 * its way back, its failure, and the question a close with changes asks first.
 */
export type SheetFrameView = {
  open: boolean;
  title: string;
  description: string | null;
  save: {
    label: string;
    pending: boolean;
    /** Waits out too many attempts. */
    blocked: boolean;
    submit: (event?: BaseSyntheticEvent) => void;
  };
  back: string;
  failure: FormFailureView | null;
  /** «رجوع», the close button, Escape or the overlay: asks first while the Sheet has changes. */
  requestClose: () => void;
  /** «تجاهل التغييرات؟», while it asks. */
  discard: {
    open: boolean;
    title: string;
    description: string;
    back: string;
    confirm: string;
    stay: () => void;
    leave: () => void;
  };
  /** Gives the focus back once the Sheet has closed: to what opened it, or its section's heading. */
  returnFocus: () => void;
};
