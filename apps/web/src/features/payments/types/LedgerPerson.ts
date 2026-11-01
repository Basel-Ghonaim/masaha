/** Someone who may have recorded a payment, as the ledger's staff filter names them. */
export type LedgerPerson = {
  id: number;
  name: string;
  /** The person signed in: «{name} (أنت)». */
  self: boolean;
  /** `false` for a reception account the owner deactivated: «{name} · موقوف». */
  active: boolean;
  /** Another owner of the space: «{name} · صاحب المساحة» (finding 166). */
  owner?: boolean;
};
