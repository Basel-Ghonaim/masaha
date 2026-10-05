import type { ManagedSpace } from '@masaha/shared/space-links';
import { directionOf } from '@shared/localisation';

/** A space as the switcher shows it, in the interface's language. */
export function choiceOf(space: ManagedSpace, english: boolean, spaceId: number | undefined) {
  // A space's English name is optional: the English interface then shows the Arabic one, marked as
  // Arabic (docs/frontend/localisation.md › Content in two languages).
  const name = (english ? space.nameEn : null) ?? space.nameAr;
  const nameLanguage = english && space.nameEn === null ? ('ar' as const) : undefined;
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
