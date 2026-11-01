/**
 * One stay of the desk's log (K8): a visit or a subscriber's check-in, as the day's two reads answer
 * them, in one shape.
 */
export interface LogEntry {
  /** Unique across both reads: the kind and the id. */
  key: string;
  kind: 'VISIT' | 'CHECK_IN';
  name: string;
  /** The customer whose file the name leads to; `null` for a visit with none. */
  customerId: number | null;
  /** A check-in's subscription's name; `null` for a visit. */
  subscription: string | null;
  /** A visit at the student price. */
  student: boolean;
  checkedInAt: string;
  checkedOutAt: string | null;
  checkoutMethod: 'MANUAL' | 'AUTO' | null;
  /** A visit whose unpaid rest the owner wrote off. */
  writtenOff: boolean;
}
