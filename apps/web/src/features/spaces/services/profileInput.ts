import { parseCoordinates } from '@shared/map';
import type { ProfileValues } from '../types/ProfileValues';

// The profile's texts that may stay empty (docs/api/api-contract.md §5, Spaces (the admin)).
const OPTIONAL_TEXTS = [
  'nameAr',
  'descriptionAr',
  'descriptionEn',
  'addressEn',
  'landmarkAr',
  'landmarkEn',
] as const;

/**
 * The profile the contract's schema reads, from what the form holds: an optional text left blank is
 * no value, and is left out; the required texts stay as typed, so an empty one is too short; the
 * area is left out until one is chosen; and the coordinates' text becomes the pin, left out while
 * there is none, and kept as text when it names no point, so the schema says it is malformed.
 */
export function profileInput(values: ProfileValues): Record<string, unknown> {
  const input: Record<string, unknown> = { nameEn: values.nameEn, addressAr: values.addressAr };
  for (const field of OPTIONAL_TEXTS) {
    if (values[field].trim() !== '') input[field] = values[field];
  }
  if (values.areaId !== null) input.areaId = values.areaId;
  if (values.location.trim() !== '') {
    input.location = parseCoordinates(values.location) ?? values.location;
  }
  return input;
}
