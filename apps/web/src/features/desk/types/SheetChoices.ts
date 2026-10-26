import type { SpacePackage } from '@masaha/shared/packages';
import type { Shift } from '@masaha/shared/spaces';

/**
 * What the page gives the subscription sheet to choose from, as other capabilities read it: the
 * space's offered packages (`packages`') with their read's state and retry, and the space's shifts
 * (`spaces'`), `null` while they load.
 */
export type SheetChoices = {
  state: 'loading' | 'failed' | 'ready';
  packages: SpacePackage[];
  retry: () => void;
  shifts: Shift[] | null;
};
