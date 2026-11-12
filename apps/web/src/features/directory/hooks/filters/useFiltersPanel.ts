import { useCopy } from '@shared/copy';
import { useMediaQuery } from '@shared/design-system';
import { useState } from 'react';
import type { DirectoryFilters } from '../../types/DirectoryFilters';
import type { FiltersView } from '../../types/FiltersView';
import { usePriceFilter } from './usePriceFilter';

/** The filters' flags, each a checkbox. */
type Flag = 'openNow' | 'evening' | 'openFriday' | 'verified' | 'studentPrices' | 'womensHall';

/** From here up the filters are a sidebar; below it, a bottom sheet (design-system › breakpoints). */
const WIDE = '(min-width: 1024px)';

/**
 * The directory's filters: the place, the price, «الدوام» and «أخرى», each applied at once;
 * drawn once, as a sidebar from 1024 px or a bottom sheet below it, whose button counts the filters
 * in force and whose primary button counts the spaces they leave (`total`, unknown until a real
 * answer). On the map they are the sheet at every width (`sheetOnly`).
 */
export function useFiltersPanel({
  filters,
  apply,
  applied,
  clear,
  total,
  sheetOnly = false,
}: {
  filters: DirectoryFilters;
  apply: (change: Partial<DirectoryFilters>) => void;
  applied: number;
  clear: () => void;
  total: number | undefined;
  sheetOnly?: boolean;
}): FiltersView {
  const copy = useCopy();
  const words = copy.directory.filters;
  const wide = useMediaQuery(WIDE) && !sheetOnly;
  const [open, setOpen] = useState(false);
  // The sheet closes once the screen reaches the sidebar's width, so it never reopens by itself on
  // the way back below it.
  if (wide && open) setOpen(false);
  const price = usePriceFilter({ filters, apply });
  /** A checkbox of one of the filters' flags, applied at once. */
  const box = (key: Flag, label: string) => ({
    key,
    label,
    checked: filters[key],
    toggle: (checked: boolean) => {
      apply({ [key]: checked });
    },
  });
  // Clearing also resets the price's own fields, which hold what the address does not.
  const clearAction = {
    disabled: applied === 0,
    run: () => {
      price.reset();
      clear();
    },
  };

  return {
    wide,
    place: {
      value: filters.areas,
      change: (ids) => {
        apply({ areas: ids });
      },
    },
    price: price.view,
    hours: {
      label: words.schedule,
      items: [
        box('openNow', words.openNow),
        box('evening', words.evening),
        box('openFriday', words.openFriday),
      ],
    },
    others: {
      label: words.other,
      items: [
        box('verified', words.verified),
        box('studentPrices', words.studentPrices),
        box('womensHall', words.womensHall),
      ],
    },
    sheet: {
      open,
      setOpen,
      title: words.title,
      description: words.description,
      count: applied,
      applied: words.applied({ count: applied }),
      show:
        total === undefined
          ? words.showLoading
          : total === 0
            ? words.showNone
            : words.show({ count: total }),
      close: words.close,
      clear: { label: copy.directory.clearFilters, ...clearAction },
    },
    sidebar: { title: words.title, clear: { label: words.clear, ...clearAction } },
  };
}
