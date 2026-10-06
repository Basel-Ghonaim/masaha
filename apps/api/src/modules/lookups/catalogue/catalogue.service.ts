import type { LookupsCatalogue } from '@masaha/shared/lookups';

import { toCatalogueAmenity, toCatalogueGovernorate } from './catalogue.mapper.ts';
import { createCatalogueRepository } from './catalogue.repository.ts';

/**
 * The public catalogue of the lookups: what a form or a filter may offer, so only the active rows.
 * A hidden governorate takes its areas with it, whatever their own flags.
 */
export function createCatalogueService() {
  const repository = createCatalogueRepository();
  return {
    async catalogue(): Promise<LookupsCatalogue> {
      const [governorates, amenities] = await Promise.all([
        repository.findActiveGovernorates(),
        repository.findActiveAmenities(),
      ]);
      return {
        governorates: governorates.map(toCatalogueGovernorate),
        amenities: amenities.map(toCatalogueAmenity),
      };
    },
  };
}

export type CatalogueService = ReturnType<typeof createCatalogueService>;
