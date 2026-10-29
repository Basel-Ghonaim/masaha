import type { SpaceNameView } from '@shared/lib';
import type { ReportRowView } from './ReportRowView';

/** One of every space's reports, worded for the admin's row and card. */
export type AdminReportRowView = ReportRowView & {
  /** The space, its name in the interface's language and its editor's link. */
  space: { name: SpaceNameView; link: string };
  /** Who reported it, by name: the admin answers for the platform (O12). */
  reporter: string;
  /** Who decides it: the admin while the space is unverified, else its owner (DI-39). */
  handledBy: { label: string; tone: 'info' | 'neutral' };
};
