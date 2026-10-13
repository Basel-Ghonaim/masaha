import type { Response } from 'express';

// The directory's answers are public and change rarely, so a browser keeps one briefly, and the
// validator Express sets on every answer (a weak ETag) lets it ask again without downloading an
// unchanged one (304).

/** How long a browser or a proxy may reuse a public answer without asking again, in seconds. */
export const PUBLIC_MAX_AGE_SECONDS = 30;

/** A public answer: anyone's, kept for a short while. */
export function cachePublicly(res: Response) {
  res.set('Cache-Control', `public, max-age=${String(PUBLIC_MAX_AGE_SECONDS)}`);
}
