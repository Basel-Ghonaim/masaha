import type { PhotoSize, PhotoUrls } from '@masaha/shared/spaces';

import type { ImageOutput } from '../../../shared/images/index.ts';

/**
 * Each photo's sizes (D5): `card`, 640×360, a 16:9 crop around the centre, for a card's cover, the
 * page's tiles and the editor's (the card's frame is 16:9, 2:1 on a phone, filled); `page`, at
 * most 1600 on its longest side, never enlarged, for a photo seen alone. A portrait keeps its middle
 * band on the card; a panorama its centre.
 */
export const PHOTO_OUTPUTS = [
  { name: 'card', width: 640, height: 360, fit: 'cover', quality: 75 },
  { name: 'page', width: 1600, height: 1600, fit: 'inside', quality: 80 },
] as const satisfies readonly (ImageOutput & { name: PhotoSize })[];

/**
 * Where a size of the photo stored under `key` lives in the storage: one key per photo, in its
 * row, each size derived from it (D4).
 */
export function objectKeyOf(key: string, size: PhotoSize): string {
  return `spaces/${key}/${size}.webp`;
}

/** Every object a photo stored under `key` has. */
export function objectKeysOf(key: string): string[] {
  return PHOTO_OUTPUTS.map(({ name }) => objectKeyOf(key, name));
}

/** The URLs of a photo's sizes, built at read time: no URL is ever stored. */
export function urlsOf(key: string, url: (objectKey: string) => string): PhotoUrls {
  return { card: url(objectKeyOf(key, 'card')), page: url(objectKeyOf(key, 'page')) };
}
