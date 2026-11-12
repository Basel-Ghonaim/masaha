import type { AmenityIconKey } from '@masaha/shared/lookups';

/**
 * The platform's amenities, in the list's order, as the page hands them from another capability
 * (`lookups`): both names, the icon, and whether each is active (`entries`), undefined while they
 * load or once their read has failed; whether it has (`failed`), and the way to read them again.
 */
export type AmenityCatalogue = {
  entries:
    | readonly {
        id: number;
        nameAr: string;
        nameEn: string;
        icon: AmenityIconKey;
        isActive: boolean;
      }[]
    | undefined;
  failed: boolean;
  retry: () => void;
};
