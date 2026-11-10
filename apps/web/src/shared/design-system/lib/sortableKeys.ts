/** How a sortable's items are laid out: a grid in the reading direction, or a list top to bottom. */
export type SortableLayout = 'grid' | 'list';

/**
 * Where the keyboard moves a lifted item, from `index` among `count`: the next index, clamped to
 * the ends, or `null` when the key is no step in this layout. Up and down move by one in both
 * layouts; in a grid, left and right follow the reading direction (in Arabic, left is forward);
 * a list moves up and down only. Home and End go to the ends.
 */
export function sortableStep(
  index: number,
  count: number,
  key: string,
  layout: SortableLayout,
  direction: 'ltr' | 'rtl',
): number | null {
  const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  const backward = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
  const last = count - 1;
  const clamp = (next: number) => Math.min(Math.max(next, 0), last);
  switch (key) {
    case 'ArrowDown':
      return clamp(index + 1);
    case 'ArrowUp':
      return clamp(index - 1);
    case 'Home':
      return 0;
    case 'End':
      return last;
    case forward:
      return layout === 'grid' ? clamp(index + 1) : null;
    case backward:
      return layout === 'grid' ? clamp(index - 1) : null;
    default:
      return null;
  }
}
