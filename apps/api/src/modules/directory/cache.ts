import type { Response } from 'express';

// The directory's answers are public and change rarely, so a browser keeps one briefly, and the
// validator Express sets on every answer (a weak ETag) lets it ask again without downloading an
// unchanged one (304). An answer ordered from the device's location is never kept anywhere
// (docs/backend/security.md › Location).

/** How long a browser or a proxy may reuse a public answer without asking again, in seconds. */
export const PUBLIC_MAX_AGE_SECONDS = 30;

/** A public answer: anyone's, kept for a short while. */
export function cachePublicly(res: Response) {
  res.set('Cache-Control', `public, max-age=${String(PUBLIC_MAX_AGE_SECONDS)}`);
}

/** An answer computed from where someone is: no cache keeps it. */
export function cachePrivately(res: Response) {
  res.set('Cache-Control', 'no-store');
}
