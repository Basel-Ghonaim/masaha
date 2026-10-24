import { useLanguage } from '@shared/localisation';
import type { PublicArea } from '../../types/PublicArea';
import { useCatalogueQuery } from './useCatalogueQuery';

/**
 * The public catalogue's areas, governorate by governorate in its order, each named in the
 * interface's language with its governorate's name: for the site's lists of places, such as Home's
 * «تصفّح حسب المنطقة». `retry` reads the catalogue again once it has failed.
 */
export function usePublicAreas(): {
  areas: PublicArea[];
  state: 'loading' | 'failed' | 'ready';
  retry: () => void;
} {
  const english = useLanguage() === 'en';
  const query = useCatalogueQuery();
  const nameOf = (place: { nameAr: string; nameEn: string }) =>
    english ? place.nameEn : place.nameAr;

  return {
    areas: (query.data?.governorates ?? []).flatMap((governorate) =>
      governorate.areas.map((area) => ({
        id: area.id,
        name: nameOf(area),
        governorate: nameOf(governorate),
      })),
    ),
    state: query.data !== undefined ? 'ready' : query.isError ? 'failed' : 'loading',
    retry: () => {
      void query.refetch();
    },
  };
}
