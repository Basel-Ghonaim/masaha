import type { AdminSpace } from '@masaha/shared/spaces';
import { COUNTED_SECTIONS, SECTION_GROUPS, type SectionId } from '../types/SectionId';

/**
 * Where a section stands: complete and fresh, complete but its group stale, missing what it shows,
 * or, for the shifts alone, optional and none.
 */
export type SectionState = 'ok' | 'stale' | 'missing' | 'optional';

/** The profile's completeness: each section's state, how many of the seven are filled, and which are not ok. */
export type Completeness = {
  states: Record<SectionId, SectionState>;
  /** The counted sections filled, stale or not («N من 7»). */
  done: number;
  total: number;
  /** The counted sections missing or stale, in the page's order: the header's line. */
  issues: SectionId[];
};

/**
 * The profile's completeness, from what each section shows (H2): the photos at least one, the prices
 * at least one, the hours saved, at least one amenity (the platform's or the space's own), an Arabic
 * description in «عن المساحة» (X2: the public page's main text), the location always (its fields are
 * required), and at least one contact. A filled section whose group is stale is `stale`, both
 * sections of a pair alike; the photos are never stale, having no date. A group saved empty is
 * missing all the same (D2 dates it, but it shows nothing). The shifts are never counted: none is
 * `optional`.
 */
export function completenessOf(space: AdminSpace, photoCount: number): Completeness {
  const filled: Record<SectionId, boolean> = {
    photos: photoCount > 0,
    prices: space.prices.length > 0,
    hours: space.hours !== null,
    shifts: (space.hours?.shifts.length ?? 0) > 0,
    amenities: space.amenityIds.length + space.ownAmenities.length > 0,
    about: (space.descriptionAr ?? '').trim() !== '',
    location: true,
    contacts: space.contacts.length > 0,
  };
  const stateOf = (section: SectionId): SectionState => {
    if (!filled[section]) return section === 'shifts' ? 'optional' : 'missing';
    if (section === 'photos') return 'ok';
    return space.staleGroups.includes(SECTION_GROUPS[section]) ? 'stale' : 'ok';
  };
  const states = {
    photos: stateOf('photos'),
    prices: stateOf('prices'),
    hours: stateOf('hours'),
    shifts: stateOf('shifts'),
    amenities: stateOf('amenities'),
    about: stateOf('about'),
    location: stateOf('location'),
    contacts: stateOf('contacts'),
  };
  return {
    states,
    done: COUNTED_SECTIONS.filter((section) => states[section] !== 'missing').length,
    total: COUNTED_SECTIONS.length,
    issues: COUNTED_SECTIONS.filter((section) => states[section] !== 'ok'),
  };
}
