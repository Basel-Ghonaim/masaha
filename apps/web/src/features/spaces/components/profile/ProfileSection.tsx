import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import { Separator } from '@shared/design-system';
import { useProfileSection } from '../../hooks/profile/useProfileSection';
import type { EditorPlace } from '../../types/EditorPlace';
import type { AreaField } from '../../types/AreaField';
import { SectionCard } from '../editor/SectionCard';
import { BasicsFields } from './BasicsFields';
import { LocationFields } from './LocationFields';

/**
 * «المساحة», the profile's section: the basics and the location as two blocks of one form, under a
 * separator, each keeping its own anchor (`#basics`, `#location`), saved, dated and confirmed as one.
 */
export function ProfileSection({
  place,
  space,
  areaField,
  onDirtyChange,
}: {
  place: EditorPlace;
  space: AdminSpace;
  areaField: AreaField;
  onDirtyChange: (group: FactGroup, dirty: boolean) => void;
}) {
  const { frame, fields } = useProfileSection({ place, space, onDirtyChange });

  return (
    <SectionCard frame={frame}>
      <section
        id="basics"
        aria-labelledby="basics-title"
        className="flex scroll-mt-28 flex-col gap-4 lg:scroll-mt-20"
      >
        <h3 id="basics-title" className="text-label">
          {fields.labels.basics}
        </h3>
        <BasicsFields form={fields} />
      </section>
      <Separator />
      <section
        id="location"
        aria-labelledby="location-title"
        className="flex scroll-mt-28 flex-col gap-4 lg:scroll-mt-20"
      >
        <h3 id="location-title" className="text-label">
          {fields.labels.location}
        </h3>
        <LocationFields form={fields} areaField={areaField} />
      </section>
    </SectionCard>
  );
}
