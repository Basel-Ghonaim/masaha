import { useAboutSection } from '../../hooks/about/useAboutSection';
import type { SectionHost } from '../../types/SectionHost';
import { SectionCard } from '../editor/SectionCard';
import { AboutSheet } from './AboutSheet';
import { AboutView } from './AboutView';

/** «عن المساحة»: the names and the descriptions as a visitor reads them, and its Sheet. */
export function AboutSection({ host }: { host: SectionHost }) {
  const view = useAboutSection(host);
  return (
    <>
      <SectionCard frame={view.frame} notice={host.notice}>
        <AboutView columns={view.columns} />
      </SectionCard>
      {host.editable && <AboutSheet host={host} />}
    </>
  );
}
