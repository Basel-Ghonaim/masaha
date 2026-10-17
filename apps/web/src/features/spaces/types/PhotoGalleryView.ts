import type { FormFailureView } from '@shared/forms';
import type { PhotoTileView, PhotoUploadTileView } from './PhotoTileView';

/** The confirmation before one photo is removed, as the gallery hands it to its dialog. */
export type PhotoRemoveDialogView = {
  open: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  confirm: () => void;
  cancel: () => void;
  /** Why the removal failed, while the dialog stays open. */
  failure: FormFailureView | null;
};

/** What the gallery offers to add, and what the last choice of files did. */
export type PhotoUploadView = {
  /** A file picker for many files, opened by the section's own button. */
  input: {
    label: string;
    accept: string;
    multiple: boolean;
    choose: (files: FileList | null) => void;
  };
  label: string;
  disabled: boolean;
  /** Why nothing more may be chosen, beside the disabled button. */
  reason: string | null;
  /** What went up of what was chosen, when some of it could not. */
  summary: string | null;
  /** The files that are not on the server yet, each with its own state. */
  tiles: PhotoUploadTileView[];
};

/**
 * «الصور», the section, ready to render: the gallery's own state — loading, failed with its retry, or
 * the photos as the server has them — its title and intro, the empty state, the line that says what
 * a move or a cover did, the files on their way up, and the dialog a removal asks in. A verified
 * space's copy carries the same photos with no actions and no picker.
 */
export type PhotoGalleryView = {
  state: 'loading' | 'failed' | 'ready';
  title: string;
  /** What the section is for; a verified space's copy carries none, for it changes nothing. */
  intro: string | null;
  /** Why the gallery could not be read. */
  failure: FormFailureView | null;
  retry: { label: string; run: () => void };
  tiles: PhotoTileView[];
  empty: { title: string; text: string } | null;
  /** A move or a cover that landed, read aloud once by a live region. */
  said: string | null;
  remove: PhotoRemoveDialogView;
  uploads: PhotoUploadView;
};
