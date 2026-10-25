/**
 * What the caller's role at the space lets them do beyond the desk's common actions (S5), as the page
 * reads it from the session's link: only to show or hide a control — the server decides.
 */
export type DeskAbilities = {
  /** «لن يُحصَّل…» and its undo: the owner's. */
  writeOff: boolean;
};
