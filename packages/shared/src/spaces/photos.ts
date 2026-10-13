// A space's photos (docs/api/api-contract.md §5, Spaces (the admin) › Photos): how many it may have,
// how large one may be sent, and the sizes each is stored in.

/** At most this many photos a space (O7, DI-32). */
export const PHOTO_LIMIT = 10;

/**
 * The largest photo a request may carry, in bytes: 4 MiB, so the request stays under the
 * platform's 4.5 MB limit with its multipart framing (ADR 0014). The web shrinks a photo first.
 */
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;

/**
 * The sizes each photo is stored in: `card`, 640×360, for a card's cover and the gallery's tiles;
 * `page`, at most 1600 on its longest side, for a photo seen alone.
 */
export const PHOTO_SIZES = ['card', 'page'] as const;

export type PhotoSize = (typeof PHOTO_SIZES)[number];
