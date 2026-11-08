import { PRICE_PERIODS } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { priceBounds } from '../../services/priceBounds';
import { pricePlaceholders } from '../../services/pricePlaceholders';
import type { DirectoryFilters } from '../../types/DirectoryFilters';
import type { PriceFilterView } from '../../types/FiltersView';
import { usePriceRanges } from './usePriceRanges';

/** How long the budget waits after the last key before it asks again, as the search does. */
const PRICE_PAUSE_MS = 400;

/** The subscription's value for «الكل»: no period, no price filter. */
const ALL = 'ALL';

type Budget = { min: number | undefined; max: number | undefined };

const textsOf = ({ min, max }: Budget) => ({
  min: min === undefined ? '' : String(min),
  max: max === undefined ? '' : String(max),
});

/**
 * The price filter: the subscription, «الكل» first, applies at once; once one is chosen, its two
 * bounds reach the address once typing pauses, only their valid values, each refused one said under
 * its field, their hints the lowest and the highest price of that subscription (`GET /price-ranges`).
 * «الكل» takes the period off with both bounds and their texts, and a price order with them, which
 * the address drops without its period. An address changed elsewhere (Back, a link) sets the texts
 * again. Clearing the filters calls `reset`, which empties the fields, a refused text included, and
 * drops a bound still waiting for its pause.
 */
export function usePriceFilter({
  filters,
  apply,
}: {
  filters: DirectoryFilters;
  apply: (change: Partial<DirectoryFilters>) => void;
}): { view: PriceFilterView; reset: () => void } {
  const words = useCopy().directory.filters;
  const ranges = usePriceRanges();
  const { period } = filters;

  const [texts, setTexts] = useState(() => textsOf(filters));
  const [seen, setSeen] = useState<Budget>({ min: filters.min, max: filters.max });
  if (filters.min !== seen.min || filters.max !== seen.max) {
    setSeen({ min: filters.min, max: filters.max });
    const typed = priceBounds(texts.min, texts.max);
    if (typed.min !== filters.min || typed.max !== filters.max) setTexts(textsOf(filters));
  }

  // The latest address, so a pause is not restarted by a render.
  const latest = useRef({ filters, apply });
  useLayoutEffect(() => {
    latest.current = { filters, apply };
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = latest.current;
      // A bound needs its period: under «الكل» there are no fields to type in.
      if (current.filters.period === undefined) return;
      const typed = priceBounds(texts.min, texts.max);
      if (typed.min !== current.filters.min || typed.max !== current.filters.max) {
        current.apply({ min: typed.min, max: typed.max });
      }
    }, PRICE_PAUSE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [texts]);

  const typed = priceBounds(texts.min, texts.max);
  const placeholders = pricePlaceholders(period === undefined ? null : ranges?.[period]);
  const view: PriceFilterView = {
    label: words.price,
    subscription: {
      label: words.subscription,
      value: period ?? ALL,
      options: [
        { value: ALL, label: words.all },
        ...PRICE_PERIODS.map((value) => ({ value, label: words.periods[value] })),
      ],
      choose: (value) => {
        if (value === ALL) {
          // The texts go, a refused one included; the bounds go with the period, which the
          // address writes none without.
          setTexts({ min: '', max: '' });
          apply({ period: undefined });
          return;
        }
        const next = PRICE_PERIODS.find((candidate) => candidate === value);
        if (next !== undefined && next !== period) apply({ period: next });
      },
    },
    range:
      period === undefined
        ? null
        : {
            min: {
              label: words.from,
              text: texts.min,
              placeholder: placeholders.min,
              change: (text) => {
                setTexts((current) => ({ ...current, min: text }));
              },
              error: typed.minError === undefined ? null : words.priceErrors[typed.minError],
            },
            max: {
              label: words.to,
              text: texts.max,
              placeholder: placeholders.max,
              change: (text) => {
                setTexts((current) => ({ ...current, max: text }));
              },
              error: typed.maxError === undefined ? null : words.priceErrors[typed.maxError],
            },
            currency: words.currency,
          },
    line:
      period === undefined
        ? words.subscriptionHint
        : words.rangeHelp({ price: words.priceNames[period] }),
  };
  return {
    view,
    // New texts restart the pause, so a bound typed just before is never written after the clear.
    reset: () => {
      setTexts({ min: '', max: '' });
    },
  };
}
