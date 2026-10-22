import { useCopy } from '@shared/copy';
import { useMediaQuery } from '@shared/design-system';
import { useState } from 'react';
import type { DirectoryFilters } from '../../types/DirectoryFilters';
import type { FiltersView } from '../../types/FiltersView';
import { usePriceFilter } from './usePriceFilter';

/** From here up the filters are a sidebar; below it, a bottom sheet (design-system › breakpoints). */
const WIDE = '(min-width: 1024px)';

/**
 * The directory's filters: the place, the price, the two switches and «أخرى», each applied at once;
 * drawn once, as a sidebar from 1024 px or a bottom sheet below it, whose button counts the filters
 * in force and whose primary button counts the spaces they leave (`total`, unknown until a real
 * answer).
 */
export function useFiltersPanel({
  filters,
  apply,
  applied,
  clear,
  total,
}: {
  filters: DirectoryFilters;
  apply: (change: Partial<DirectoryFilters>) => void;
  applied: number;
  clear: () => void;
  total: number | undefined;
}): FiltersView {
  const copy = useCopy();
  const words = copy.directory.filters;
  const wide = useMediaQuery(WIDE);
  const [open, setOpen] = useState(false);
  // The sheet closes once the screen reaches the sidebar's width, so it never reopens by itself on
  // the way back below it.
  if (wide && open) setOpen(false);
  const price = usePriceFilter({ filters, apply });
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
    spaces: {
      label: words.spaces,
      availableNow: {
        label: words.availableNow,
        checked: filters.availableNow,
        toggle: (checked) => {
          apply({ availableNow: checked });
        },
      },
      verified: {
        label: words.verified,
        checked: filters.verified,
        toggle: (checked) => {
          apply({ verified: checked });
        },
      },
      note: words.availableNote,
    },
    others: {
      label: words.other,
      value: [
        ...(filters.studentPrices ? ['students'] : []),
        ...(filters.openFriday ? ['friday'] : []),
      ],
      options: [
        { value: 'students', label: words.studentPrices },
        { value: 'friday', label: words.openFriday },
      ],
      change: (values) => {
        apply({
          studentPrices: values.includes('students'),
          openFriday: values.includes('friday'),
        });
      },
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
