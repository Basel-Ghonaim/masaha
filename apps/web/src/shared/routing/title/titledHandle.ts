import type { Catalogue } from '@shared/copy';

/**
 * What a route says of its page in its `handle`: the page's title, read from the catalogue it is
 * handed, so the route's definition carries no words of its own.
 */
export type TitledHandle = { title: (copy: Catalogue) => string };

/** Whether a route's `handle` carries a title. */
export function isTitled(handle: unknown): handle is TitledHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    'title' in handle &&
    typeof handle.title === 'function'
  );
}
