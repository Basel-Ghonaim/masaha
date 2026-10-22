import { PRICE_PERIODS } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DEFAULT_PERIOD } from '../../services/filtersOf';
import { priceBounds } from '../../services/priceBounds';
import type { DirectoryFilters } from '../../types/DirectoryFilters';
import type { PriceFilterView } from '../../types/FiltersView';

/** How long the budget waits after the last key before it asks again, as the search does. */
const PRICE_PAUSE_MS = 400;

type Budget = { min: number | undefined; max: number | undefined };

const textsOf = ({ min, max }: Budget) => ({
  min: min === undefined ? '' : String(min),
  max: max === undefined ? '' : String(max),
});

/**
 * The price filter: the period applies at once; the two bounds reach the address once typing
 * pauses, only their valid values, each refused one said under its field. An address changed
 * elsewhere (Back, a link) sets the texts again. The address writes a period only with a bound, so a
 * period chosen before any bound is kept here until one is typed. Clearing the filters calls `reset`,
 * which empties the fields, a refused text included, returns the period to the default and drops a
 * bound still waiting for its pause.
 */
export function usePriceFilter({
  filters,
  apply,
}: {
  filters: DirectoryFilters;
  apply: (change: Partial<DirectoryFilters>) => void;
}): { view: PriceFilterView; reset: () => void } {
  const words = useCopy().directory.filters;
  const bounded = filters.min !== undefined || filters.max !== undefined;

  const [chosen, setChosen] = useState(filters.period);
  const [seenPeriod, setSeenPeriod] = useState(filters.period);
  if (filters.period !== seenPeriod) {
    setSeenPeriod(filters.period);
    setChosen(filters.period);
  }
  const period = bounded ? filters.period : chosen;

  const [texts, setTexts] = useState(() => textsOf(filters));
  const [seen, setSeen] = useState<Budget>({ min: filters.min, max: filters.max });
  if (filters.min !== seen.min || filters.max !== seen.max) {
    setSeen({ min: filters.min, max: filters.max });
    const typed = priceBounds(texts.min, texts.max);
    if (typed.min !== filters.min || typed.max !== filters.max) setTexts(textsOf(filters));
  }

  // The latest address and period, so a pause is not restarted by a render.
  const latest = useRef({ filters, apply, period });
  useLayoutEffect(() => {
    latest.current = { filters, apply, period };
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = latest.current;
      const typed = priceBounds(texts.min, texts.max);
      if (typed.min !== current.filters.min || typed.max !== current.filters.max) {
        current.apply({ min: typed.min, max: typed.max, period: current.period });
      }
    }, PRICE_PAUSE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [texts]);

  const typed = priceBounds(texts.min, texts.max);
  const view: PriceFilterView = {
    label: words.price,
    period: {
      label: words.period,
      value: period,
      options: PRICE_PERIODS.map((value) => ({ value, label: words.periods[value] })),
      choose: (value) => {
        const next = PRICE_PERIODS.find((candidate) => candidate === value);
        if (next === undefined) return;
        setChosen(next);
        if (bounded) apply({ period: next });
      },
    },
    min: {
      label: words.from,
      text: texts.min,
      change: (text) => {
        setTexts((current) => ({ ...current, min: text }));
      },
      error: typed.minError === undefined ? null : words.priceErrors[typed.minError],
    },
    max: {
      label: words.to,
      text: texts.max,
      change: (text) => {
        setTexts((current) => ({ ...current, max: text }));
      },
      error: typed.maxError === undefined ? null : words.priceErrors[typed.maxError],
    },
    currency: words.currency,
    help: words.rangeHelp({ period: words.periodPrices[period] }),
  };
  return {
    view,
    // New texts restart the pause, so a bound typed just before is never written after the clear.
    reset: () => {
      setTexts({ min: '', max: '' });
      setChosen(DEFAULT_PERIOD);
    },
  };
}
