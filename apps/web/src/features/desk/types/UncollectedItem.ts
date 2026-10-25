import type { UncollectedVisit } from '@masaha/shared/payments';

/** An uncollected visit as its row and its dialogs name it: the visit and its money, who, and when. */
export type UncollectedItem = {
  uncollected: UncollectedVisit;
  /** The visit's customer's name, else its visitor's. */
  name: string;
  /** The day it closed: «اليوم», «أمس», else the date. */
  day: string;
};
