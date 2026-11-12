import { useAmenitiesSection } from '../../hooks/amenities/useAmenitiesSection';
import type { AmenitiesField } from '../../types/AmenitiesField';
import type { AmenityCatalogue } from '../../types/AmenityCatalogue';
import type { SectionHost } from '../../types/SectionHost';
import { SectionCard } from '../editor/SectionCard';
import { AmenitiesSheet } from './AmenitiesSheet';
import { AmenitiesView } from './AmenitiesView';

/** «المرافق»: what the space offers, as a visitor reads it, and its Sheet. */
export function AmenitiesSection({
  host,
  amenitiesField,
  catalogue,
  listLink,
}: {
  host: SectionHost;
  amenitiesField: AmenitiesField;
  catalogue: AmenityCatalogue;
  listLink: string | null;
}) {
  const view = useAmenitiesSection(host, catalogue);
  return (
    <>
      <SectionCard frame={view.frame} notice={host.notice} empty={view.empty}>
        <AmenitiesView view={view} />
      </SectionCard>
      {host.editable && (
        <AmenitiesSheet
          host={host}
          amenitiesField={amenitiesField}
          catalogue={catalogue}
          listLink={listLink}
        />
      )}
    </>
  );
}
