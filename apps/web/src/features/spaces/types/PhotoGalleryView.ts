import type { SortableWords } from '@shared/design-system/sortable';
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
  /** The limits beside the button: how many, which types, how large. */
  limits: string;
  /** At ten photos, the line that stands in for the button. */
  full: string | null;
  /** What went up of what was chosen, when some of it could not. */
  summary: string | null;
  /** The files that are not on the server yet, each with its own state. */
  tiles: PhotoUploadTileView[];
};

/**
 * «الصور», the section, ready to render: the gallery's own state — loading, failed with its retry, or
 * the photos as the server has them — its count, the view's words, the empty state, the files on
 * their way up, and the dialog a removal asks in.
 */
export type PhotoGalleryView = {
  state: 'loading' | 'failed' | 'ready';
  title: string;
  /** «6 من 10 صور». */
  count: string;
  /** Why the gallery could not be read. */
  failure: FormFailureView | null;
  retry: { label: string; run: () => void };
  tiles: PhotoTileView[];
  /** The view's words: the cover's badge, the count on a phone, and «+N» past five. */
  view: {
    cover: string;
    total: string;
    others: string;
    more: { text: string; label: string } | null;
  };
  /** Why the gallery was read again under the user, for everyone to read. */
  changed: string | null;
  /** The order by dragging, once two photos can be ordered: the sortable's words, held while a move travels. */
  order: {
    label: string;
    hint: string;
    held: boolean;
    words: SortableWords;
    move: (ids: number[], moved: number) => void;
  } | null;
  empty: { text: string; hint: string; action: string } | null;
  remove: PhotoRemoveDialogView;
  uploads: PhotoUploadView;
};
