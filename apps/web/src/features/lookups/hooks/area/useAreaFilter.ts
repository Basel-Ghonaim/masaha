import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import { useCatalogueQuery } from './useCatalogueQuery';

/**
 * The site's place filter, ready to render: the public catalogue's areas, each governorate that has
 * one a group under its name, every area found by either of its names. The summary says what is
 * chosen: all areas, the one area by its name, or a count (an id the catalogue no longer holds is
 * counted). While the catalogue loads it says so; once it has failed, the list says so and offers
 * to try again.
 */
export function useAreaFilter({ value }: { value: readonly number[] }) {
  const copy = useCopy();
  const words = copy.lookups.areaFilter;
  const english = useLanguage() === 'en';
  const query = useCatalogueQuery();
  const nameOf = (place: { nameAr: string; nameEn: string }) =>
    english ? place.nameEn : place.nameAr;
  const governorates = query.data?.governorates ?? [];

  const summary = (() => {
    if (value.length === 0) return words.all;
    if (value.length === 1) {
      for (const governorate of governorates) {
        const area = governorate.areas.find(({ id }) => id === value[0]);
        if (area !== undefined) return nameOf(area);
      }
    }
    return words.chosen({ count: value.length });
  })();

  return {
    label: words.label,
    summary,
    search: words.search,
    searchPlaceholder: words.searchPlaceholder,
    list: words.list,
    none: words.none,
    groups: governorates
      .filter(({ areas }) => areas.length > 0)
      .map((governorate) => ({
        key: governorate.id,
        heading: nameOf(governorate),
        items: governorate.areas.map((area) => ({
          value: String(area.id),
          text: nameOf(area),
          keywords: [area.nameAr, area.nameEn],
        })),
      })),
    loading: query.isPending ? words.loading : null,
    failure:
      query.isError && query.data === undefined
        ? {
            line: words.failed,
            retry: {
              label: copy.status.retry,
              run: () => {
                void query.refetch();
              },
            },
          }
        : null,
  };
}
