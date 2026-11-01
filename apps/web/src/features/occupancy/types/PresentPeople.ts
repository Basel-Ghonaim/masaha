import type { PresentPerson } from '@masaha/shared/occupancy';

/** What the page knows of the people present beyond the state now (the desk's open check-ins). */
export type PresentPeople = {
  /** A subscriber's plan's name, their badge; `null` when it is not known. */
  plan: (person: PresentPerson) => string | null;
  /** The way to a customer's file, where a subscriber's name leads. */
  fileLink: (customerId: number) => string;
};
