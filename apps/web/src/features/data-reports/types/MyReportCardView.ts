import type { SpaceNameView } from '@shared/lib';
import type { StatusView } from '../services/reportView';

/** One of the user's own reports, worded for its card in «بلاغاتي» (screen 11). */
export type MyReportCardView = {
  key: string;
  space: {
    name: SpaceNameView;
    /** Its page's address while the space is listed; `null` once it left the directory. */
    link: string | null;
    /** The line that says it left the directory (C7), else `null`. */
    gone: string | null;
  };
  /** «{field} · أُرسل {day}»: the day only, on Gaza's calendar. */
  meta: string;
  /** Its status as the reporter reads it. */
  status: StatusView;
  /**
   * The message, if the user wrote one; one over 160 characters is folded to two lines with its
   * toggle, decided from its length, never measured (DI-54). `id` names it for the toggle.
   */
  message: {
    id: string;
    text: string;
    toggle: { label: string; expanded: boolean; run: () => void } | null;
  } | null;
  /** The reply, labelled by who replied (DI-56); none while open or decided without one. */
  reply: { label: string; text: string } | null;
};
