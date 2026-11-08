import type { ReactNode } from 'react';
import { FILTERS_FORM_ID } from '../../services/focusFilters';
import type { FiltersView } from '../../types/FiltersView';
import { CheckGroup } from './CheckGroup';
import { PriceFilter } from './PriceFilter';

/**
 * The filters themselves, the same in the sidebar and the sheet, top to bottom: the place (the
 * page's slot), the price, «الدوام» and «أخرى».
 */
export function FiltersForm({ filters, place }: { filters: FiltersView; place: ReactNode }) {
  return (
    <div id={FILTERS_FORM_ID} className="flex flex-col gap-6">
      {place}
      <PriceFilter price={filters.price} />
      <CheckGroup group={filters.hours} />
      <CheckGroup group={filters.others} />
    </div>
  );
}
