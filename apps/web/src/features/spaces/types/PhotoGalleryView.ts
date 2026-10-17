import type { FormFailureView } from '@shared/forms';
import type { PhotoTileView } from './PhotoTileView';

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

/**
 * «الصور», the section, ready to render: the gallery's own state — loading, failed with its retry, or
 * the photos as the server has them — its title and intro, the empty state, the line that says what
 * a move or a cover did, and the dialog a removal asks in. A verified space's copy carries the same
 * photos with no actions and no picker.
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
};
