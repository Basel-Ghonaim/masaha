import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import { periodText } from '../../services/periodText';
import { runningClosure } from '../../services/runningClosure';
import { textOf } from '../../services/textOf';
import { typeView } from '../../services/typeView';
import type { PublicAnnouncement } from '../../types/PublicAnnouncement';
import type { PublicItemView } from '../../types/PublicItemView';

/** A space's public announcements, ready to draw: the running closure's notice, and the others. */
export type PublicAnnouncementsView = {
  /** The running closure, shown at the page's top (DI-59); none without one. */
  notice: { item: PublicItemView; notice: string } | null;
  /** The section's heading. */
  title: string;
  /** The others by their start, the running closure left out. */
  items: { key: string; item: PublicItemView }[];
};

/**
 * A space's running and upcoming announcements as its public page shows them (U8, DI-59): the
 * running closure apart, as a notice with «إعلان من إدارة المساحة · {period}»; the others by their
 * start, each with its type, its period on Gaza's clock and its text in the interface's language
 * (the Arabic, marked, when an English one is missing).
 */
export function usePublicAnnouncements(
  announcements: readonly PublicAnnouncement[],
): PublicAnnouncementsView {
  const words = useCopy().announcements;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const now = new Date();
  const closure = runningClosure(announcements, now);
  const viewOf = (announcement: PublicAnnouncement): PublicItemView => {
    const { label, tone } = typeView(announcement.type, words);
    return {
      type: { label, tone },
      period: periodText(announcement, language, now, words.period),
      text: textOf(announcement, language),
    };
  };
  const closureView = closure === null ? null : viewOf(closure);

  return {
    notice:
      closureView === null
        ? null
        : { item: closureView, notice: words.public.notice({ period: closureView.period }) },
    title: words.public.title,
    items: announcements
      .filter((announcement) => announcement.id !== closure?.id)
      .toSorted((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id - b.id)
      .map((announcement) => ({ key: String(announcement.id), item: viewOf(announcement) })),
  };
}
