import { useLocationSection } from '../../hooks/location/useLocationSection';
import type { AreaField } from '../../types/AreaField';
import type { AreaLine } from '../../types/AreaLine';
import type { SectionHost } from '../../types/SectionHost';
import { SectionCard } from '../editor/SectionCard';
import { LocationSheet } from './LocationSheet';
import { LocationView } from './LocationView';

/** «الموقع»: the place as a visitor reads it, and its Sheet. */
export function LocationSection({
  host,
  areaLine,
  areaField,
}: {
  host: SectionHost;
  areaLine: AreaLine;
  areaField: AreaField;
}) {
  const view = useLocationSection(host);
  return (
    <>
      <SectionCard frame={view.frame} notice={host.notice}>
        <LocationView view={view} areaLine={areaLine(view.areaId)} />
      </SectionCard>
      {host.editable && <LocationSheet host={host} areaField={areaField} />}
    </>
  );
}
