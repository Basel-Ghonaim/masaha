import type { useSpaceSwitcher } from '../hooks/useSpaceSwitcher';

/** A space as the switcher shows it, in the interface's language. */
export type SpaceChoice = ReturnType<typeof useSpaceSwitcher>['spaces'][number];
