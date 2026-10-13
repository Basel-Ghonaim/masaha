import type { AdminSpace } from '@masaha/shared/spaces';
import { formatCoordinates } from '@shared/map';
import type { ProfileValues } from '../types/ProfileValues';

/** A space's profile as its form holds it: a missing text as empty, the pin as its coordinates. */
export function profileValues(
  space: Pick<
    AdminSpace,
    | 'nameAr'
    | 'nameEn'
    | 'descriptionAr'
    | 'descriptionEn'
    | 'areaId'
    | 'addressAr'
    | 'addressEn'
    | 'landmarkAr'
    | 'landmarkEn'
    | 'location'
  >,
): ProfileValues {
  return {
    nameAr: space.nameAr ?? '',
    nameEn: space.nameEn,
    descriptionAr: space.descriptionAr ?? '',
    descriptionEn: space.descriptionEn ?? '',
    areaId: space.areaId,
    addressAr: space.addressAr,
    addressEn: space.addressEn ?? '',
    landmarkAr: space.landmarkAr ?? '',
    landmarkEn: space.landmarkEn ?? '',
    location: formatCoordinates(space.location),
  };
}
