import type { FormFailureView } from '@shared/forms';
import type { NoticeSection } from '../services/noticeSection';

/**
 * One open report's notice, ready to render inside the section its field is edited in (`section`):
 * open, its words and «تم التصحيح» with the way to reply; or, once marked here, that it was, with
 * the way back to the reports.
 */
export type ReportNoticeView = {
  section: NoticeSection;
  title: string;
  said: { text: string; message: { none: boolean } };
} & (
  | {
      state: 'open';
      resolve: { label: string; pending: boolean; blocked: boolean; run: () => void };
      open: { label: string; href: string };
      failure: FormFailureView | null;
    }
  | { state: 'resolved'; line: string; back: { label: string; href: string } }
);
