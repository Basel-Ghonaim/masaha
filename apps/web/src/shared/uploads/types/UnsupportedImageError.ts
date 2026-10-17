/**
 * The one failure the shrinker raises: the browser cannot decode this file into an image, cannot
 * draw it, or cannot write it out. A file the browser refuses is refused here, before any request,
 * rather than sent for the server to refuse (D2).
 */
export class UnsupportedImageError extends Error {
  override readonly name = 'UnsupportedImageError';
}
