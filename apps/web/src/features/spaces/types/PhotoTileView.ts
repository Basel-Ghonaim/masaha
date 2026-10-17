import type { FormFailureView } from '@shared/forms';

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
