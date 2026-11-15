import type { GlyphName } from '@shared/design-system';
import { knownAmenityIcon } from '@shared/lib';
import { useCatalogueQuery } from '../area/useCatalogueQuery';
import { useAmenitiesQuery } from '../list/useAmenitiesQuery';
import type { LookupsSource } from '../../types/LookupsSource';

/** One amenity of the platform's list: its names in both languages, its icon, and whether active. */
export type CatalogueEntry = {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: GlyphName | null;
  isActive: boolean;
};

/**
 * The platform's amenities as a page hands them to a space's profile (`entries`): undefined while the
 * list loads or once its read has failed, which `failed` says, and `retry` reads it again.
 */
export type AmenityCatalogueRead = {
  entries: CatalogueEntry[] | undefined;
  failed: boolean;
  retry: () => void;
};

/**
 * The platform's amenities, in the list's order, each with both names and its icon: what a page
 * hands a space's profile to show the amenities it offers and to tell a space's own amenity from one
 * already listed. From the admin's list (`source`) every one, retired ones included; from the public
 * catalogue, an owner's only list, the active ones. While the list loads there are none; once its
 * read has failed, it says so, with the way to read it again.
 */
export function useAmenityCatalogue(source: LookupsSource): AmenityCatalogueRead {
  const adminList = useAmenitiesQuery({ enabled: source === 'admin' });
  const catalogue = useCatalogueQuery({ enabled: source === 'public' });
  const query = source === 'admin' ? adminList : catalogue;
  const entries =
    source === 'admin'
      ? adminList.data?.map(({ id, nameAr, nameEn, icon, isActive }) => ({
          id,
          nameAr,
          nameEn,
          icon: knownAmenityIcon(icon),
          isActive,
        }))
      : catalogue.data?.amenities.map(({ id, nameAr, nameEn, icon }) => ({
          id,
          nameAr,
          nameEn,
          icon: knownAmenityIcon(icon),
          isActive: true,
        }));
  return {
    entries,
    failed: entries === undefined && query.isError,
    retry: () => {
      void query.refetch();
    },
  };
}
