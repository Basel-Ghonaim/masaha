import { useCopy } from '@shared/copy';
import { weekRows } from '@shared/lib';
import type { SectionHost } from '../../types/SectionHost';
import { useSectionFrame } from '../editor/useSectionFrame';

/**
 * «ساعات العمل», read first (W1): the week as the public page shows it, Saturday first, days with
 * the same hours on one line, «مغلقة», and today, on Gaza's calendar, marked «اليوم»; for the owner,
 * the way to a closure announcement (DI-5). Without hours, its empty state and «أضف ساعات العمل».
 */
export function useHoursSection(host: SectionHost, closureLink: string | null) {
  const words = useCopy().spaces.editor.hours;
  const { space } = host;
  const open = () => {
    host.openSheet('hours');
  };
  const frame = useSectionFrame({
    place: host.place,
    space,
    section: 'hours',
    editable: host.editable,
    empty: space.hours === null,
    edit: open,
  });
  return {
    frame,
    caption: words.caption,
    today: words.today,
    rows:
      space.hours === null ? [] : weekRows(space.hours.days, new Date(), words.week, false).rows,
    closure:
      closureLink === null || !host.editable
        ? null
        : { lead: words.closureLead, label: words.closureLink, href: closureLink },
    empty:
      space.hours === null
        ? {
            text: words.empty.text,
            hint: words.empty.hint,
            action: host.editable ? { label: words.empty.action, run: open, primary: true } : null,
          }
        : null,
  };
}

export type HoursSectionView = ReturnType<typeof useHoursSection>;
