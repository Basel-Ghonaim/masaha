import type { AdminSpace } from '@masaha/shared/spaces';
import type { ReactNode } from 'react';
import { useReadOnlyAmenities } from '../../hooks/amenities/useReadOnlyAmenities';
import { ReadOnlyCard } from '../editor/ReadOnlyCard';
import { ReadOnlyItem } from '../editor/ReadOnlyRows';

/** «المرافق» of a verified space, to read: the platform's, named by `amenityNames`, and its own. */
export function ReadOnlyAmenities({
  space,
  amenityNames,
}: {
  space: AdminSpace;
  amenityNames: (ids: number[]) => ReactNode;
}) {
  const view = useReadOnlyAmenities(space);
  const none = <span className="text-muted-foreground">{view.none}</span>;

  return (
    <ReadOnlyCard id="amenities" title={view.title}>
      <dl className="flex flex-col divide-y divide-border">
        <ReadOnlyItem label={view.availableLabel}>
          {view.amenityIds.length === 0 ? none : amenityNames(view.amenityIds)}
        </ReadOnlyItem>
        <ReadOnlyItem label={view.ownLabel}>
          {view.own.length === 0 ? (
            none
          ) : (
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {view.own.map((name) => (
                <li key={name.key} lang={name.lang} dir={name.dir}>
                  {name.text}
                </li>
              ))}
            </ul>
          )}
        </ReadOnlyItem>
      </dl>
    </ReadOnlyCard>
  );
}
