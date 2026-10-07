import type { ReactNode } from 'react';
import type { PlaceFilter } from './PlaceFilter';

/**
 * The list's place field, which the page that sets the list draws from another capability: it is
 * handed the filter's value and how to change it, and sits inside the list's own Field.
 */
export type PlaceField = (field: {
  value: PlaceFilter;
  onChange: (value: PlaceFilter) => void;
}) => ReactNode;
