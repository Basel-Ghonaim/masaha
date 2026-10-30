import type { ActionView } from '../services/actionWords';
import type { TargetView } from '../services/targetOf';

/** One entry of a log, ready to render. */
export type AuditRowView = {
  key: string;
  /** The Gaza date with its year · the time. */
  at: string;
  /** Who acted: a person's name, isolated, or «فريق مساحة» / «النظام». */
  actor: { text: string; person: boolean };
  action: ActionView;
  target: TargetView;
  /** The admin's: «في {space}», the space the entry names besides its target. */
  space: string | null;
  details: string | null;
};
