import type { ManagedSpace } from '@masaha/shared/space-links';
import { directionOf } from '@shared/localisation';

/** A space as the switcher shows it, in the interface's language. */
export function choiceOf(space: ManagedSpace, english: boolean, spaceId: number | undefined) {
  // A space's Arabic name is optional: the Arabic interface then shows the English one, marked as
  // English (docs/frontend/localisation.md › Content in two languages).
  const name = (english ? null : space.nameAr) ?? space.nameEn;
  const nameLanguage = !english && space.nameAr === null ? ('en' as const) : undefined;
  return {
    spaceId: space.spaceId,
    role: space.role,
    name,
    /** The name's language, when it is not the interface's. */
    nameLanguage,
    /** The name's direction, when it is not the interface's. */
    nameDir: nameLanguage && directionOf(nameLanguage),
    area: english ? space.area.nameEn : space.area.nameAr,
    /** The name's first character, the space's mark. */
    initial: Array.from(name)[0] ?? '',
    isCurrent: space.spaceId === spaceId,
  };
}
