import type { FormFailureView, Refusal } from '@shared/forms';

/** What one photo in the gallery offers, and whether it is there to offer it. */
export type PhotoActions = {
  before: { label: string; disabled: boolean; busy: boolean; run: () => void };
  after: { label: string; disabled: boolean; busy: boolean; run: () => void };
  /** Null on the cover itself: the first photo is already the cover. */
  cover: { label: string; run: () => void } | null;
  remove: { label: string; run: () => void };
};

/** One photo of the gallery, ready to render: its thumb, its place and what may be done with it. */
export type PhotoTileView = {
  /** The photo's id on the server, the one every write names. */
  id: number;
  /** `photo-<id>`: the tile's own place in the list, whatever the order. */
  key: string;
  /** 1-based, as the gallery shows it. */
  position: number;
  label: string;
  cover: boolean;
  image: { src: string };
  /** Why the last write on it failed, read as any refusal is. */
  failure: FormFailureView | null;
  /** Null on a verified space, whose photos nothing may change. */
  actions: PhotoActions | null;
};

/** Where a chosen file stands while it travels: being read, going up, or refused. */
export type PhotoUploadState = 'preparing' | 'uploading' | 'failed';

/**
 * One chosen file that is not on the server yet: its own state, its own percentage and its own
 * failure. It has no id and no place in the gallery — it is not a row until the server writes one.
 */
export type PhotoUploadTileView = {
  /** `upload-<local id>`: the tile's own place in the list, whatever the order. */
  key: string;
  /** The file's own name, as the admin chose it. */
  fileName: string;
  state: PhotoUploadState;
  /** 0–100, only while uploading. */
  progress: number | null;
  /** The browser refused to read it at all: no request was made, so no refusal either. */
  unsupported: boolean;
  /** What the server refused, for the tile's own reader; never a message of this module's. */
  refusal: Refusal | null;
  /** Null where a re-send of the same bytes could not succeed. */
  retry: { label: string; run: () => void } | null;
  /** Takes the file off the list, whether it failed or not. */
  drop: { label: string; run: () => void };
};
