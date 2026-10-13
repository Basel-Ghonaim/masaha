import type { AdminSpace } from '@masaha/shared/spaces';
import { Separator } from '@shared/design-system';
import type { ReactNode } from 'react';
import { useReadOnlyProfile } from '../../hooks/profile/useReadOnlyProfile';
import { ReadOnlyCard } from '../editor/ReadOnlyCard';
import { ReadOnlyItem, ReadOnlyRows } from '../editor/ReadOnlyRows';

/** «المساحة» of a verified space, to read: its basics and its location, the area named by `areaName`. */
export function ReadOnlyProfile({
  space,
  areaName,
}: {
  space: AdminSpace;
  areaName: (areaId: number) => ReactNode;
}) {
  const view = useReadOnlyProfile(space);

  return (
    <ReadOnlyCard id="profile" title={view.title}>
      <section aria-labelledby="basics-title" className="flex flex-col gap-2">
        <h3 id="basics-title" className="text-label">
          {view.basicsTitle}
        </h3>
        <ReadOnlyRows rows={view.basics} none={view.none} />
      </section>
      <Separator />
      <section aria-labelledby="location-title" className="flex flex-col gap-2">
        <h3 id="location-title" className="text-label">
          {view.locationTitle}
        </h3>
        <ReadOnlyRows
          rows={view.location}
          none={view.none}
          before={<ReadOnlyItem label={view.areaLabel}>{areaName(space.areaId)}</ReadOnlyItem>}
        />
      </section>
    </ReadOnlyCard>
  );
}
