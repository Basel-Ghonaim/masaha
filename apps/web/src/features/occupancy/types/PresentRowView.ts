import type { PresentPerson } from '@masaha/shared/occupancy';

/** A person present, worded for the desk's list. */
export type PresentRowView = {
  /** Their kind and id, such as `VISIT-12`: a visit and a check-in may share an id. */
  key: string;
  /** The person as the server sent them, for the row's action. */
  person: PresentPerson;
  name: string;
  /** «زيارة» or «اشتراك». */
  kind: string;
  /** «منذ 10:00», on Gaza's clock. */
  since: string;
  /** How long they have stayed so far. */
  duration: string;
  /** A visit's charge so far from the server, or that it is set at check-out; nothing for a check-in. */
  detail: string | null;
};
