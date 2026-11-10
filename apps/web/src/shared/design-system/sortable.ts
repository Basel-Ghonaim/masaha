// The design-system layer's fourth entry, @shared/design-system/sortable: the list its user
// reorders by dragging, built on dnd-kit. Only what draws it imports this entry, so the library
// stays out of the site's first download (docs/frontend/design-system/foundation.md §3).
export {
  Sortable,
  type SortableHandleProps,
  type SortableItemState,
  type SortablePlace,
  type SortableProps,
  type SortableWords,
} from './components/fields/Sortable';
export type { SortableLayout } from './lib/sortableKeys';
