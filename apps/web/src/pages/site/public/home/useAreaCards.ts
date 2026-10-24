import { useAreaCounts } from '@features/directory';
import { usePublicAreas } from '@features/lookups';
import { useCopy } from '@shared/copy';
import { isolate } from '@shared/localisation';
import { SITE_PATHS } from '../../navigation';

/** An area's card on Home: its name, its governorate and count, and the Directory filtered by it. */
export type AreaCard = { key: string; title: string; line: string; to: string };

/**
 * «تصفّح حسب المنطقة»: the public catalogue's areas that hold at least one space, in its order, each
 * with its governorate and its count, leading to the Directory filtered by it; then «كل المناطق»,
 * the Strip and the total, leading to the whole Directory. While either read loads, it is loading;
 * once either has failed, one retry reads both again.
 */
export function useAreaCards(): {
  title: string;
  state: 'loading' | 'failed' | 'ready';
  cards: AreaCard[];
  failed: string;
  retry: { label: string; run: () => void };
} {
  const copy = useCopy();
  const words = copy.site.home.areas;
  const areas = usePublicAreas();
  const counts = useAreaCounts();
  const lineOf = (place: string, count: number) =>
    words.line({ place: isolate(place), count: words.count({ count }) });

  const cards: AreaCard[] = areas.areas.flatMap((area) => {
    const count = counts.counts.get(area.id) ?? 0;
    return count === 0
      ? []
      : [
          {
            key: String(area.id),
            title: area.name,
            line: lineOf(area.governorate, count),
            to: `${SITE_PATHS.spaces}?area=${String(area.id)}`,
          },
        ];
  });

  return {
    title: words.title,
    state:
      areas.state === 'failed' || counts.state === 'failed'
        ? 'failed'
        : areas.state === 'ready' && counts.state === 'ready'
          ? 'ready'
          : 'loading',
    cards: [
      ...cards,
      {
        key: 'all',
        title: words.all,
        line: lineOf(words.strip, counts.total),
        to: SITE_PATHS.spaces,
      },
    ],
    failed: words.failed,
    retry: {
      label: copy.status.retry,
      run: () => {
        areas.retry();
        counts.retry();
      },
    },
  };
}
