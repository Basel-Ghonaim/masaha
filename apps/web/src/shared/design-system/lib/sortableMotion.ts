/**
 * How a sortable's items slide aside while one is dragged: dnd-kit writes its transition inline as
 * `transform <ms>ms <easing>`, a number it cannot read from a token. It is given the layer's easing,
 * and its duration is swapped for the layer's medium duration, which reduced motion sets to 0ms
 * (docs/frontend/design-system/foundation.md §5).
 */
export const SORTABLE_TRANSITION = { duration: 250, easing: 'var(--easing-standard)' };

/** dnd-kit's inline transition on the layer's motion tokens; its instant `0ms` kept as it is. */
export function sortableTransition(transition: string | null | undefined): string | undefined {
  if (!transition) return undefined;
  return transition.replace(`${String(SORTABLE_TRANSITION.duration)}ms`, 'var(--duration-medium)');
}
