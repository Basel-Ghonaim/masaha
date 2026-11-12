import { usePricesSection } from '../../hooks/prices/usePricesSection';
import type { SectionHost } from '../../types/SectionHost';
import { SectionCard } from '../editor/SectionCard';
import { PricesSheet } from './PricesSheet';
import { PricesView } from './PricesView';

/** «الأسعار المعلنة»: the prices as a visitor reads them, and their Sheet, the only place they are edited (R1). */
export function PricesSection({ host }: { host: SectionHost }) {
  const view = usePricesSection(host);
  return (
    <>
      <SectionCard frame={view.frame} notice={host.notice} empty={view.empty}>
        <PricesView table={view.table} />
        <p className="text-caption text-muted-foreground">{view.note}</p>
      </SectionCard>
      {host.editable && <PricesSheet host={host} />}
    </>
  );
}
