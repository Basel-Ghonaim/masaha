import { useHoursSection } from '../../hooks/hours/useHoursSection';
import type { SectionHost } from '../../types/SectionHost';
import { SectionCard } from '../editor/SectionCard';
import { HoursSheet } from './HoursSheet';
import { HoursView } from './HoursView';

/** «ساعات العمل»: the week as a visitor reads it, and its Sheet. */
export function HoursSection({
  host,
  closureLink,
}: {
  host: SectionHost;
  closureLink: string | null;
}) {
  const view = useHoursSection(host, closureLink);
  return (
    <>
      <SectionCard frame={view.frame} notice={host.notice} empty={view.empty}>
        <HoursView view={view} />
      </SectionCard>
      {host.editable && <HoursSheet host={host} />}
    </>
  );
}
