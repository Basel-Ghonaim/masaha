import type { AdminAmenity } from '@masaha/shared/lookups';
import { Badge } from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useAmenityRow } from '../../hooks/list/useAmenityRow';
import { AmenityIcon } from '../AmenityIcon';
import { EditAmenityForm } from '../sheet/EditAmenityForm';
import { LookupSheet } from '../sheet/LookupSheet';
import { RowControls } from './RowControls';

/**
 * An amenity in its list: its icon, its name in the interface's language then the other, its badges
 * when the filter leaves it out or it is retired, and its controls with its edit sheet, which wrap
 * under the names on a narrow screen; then, on a line of its own, the failure of the last action on
 * it, which names the amenity by where it stands. A retired amenity's name is dimmed.
 */
export function AmenityRow(props: {
  amenity: AdminAmenity;
  /** The section waits out a 429. */
  blocked: boolean;
}) {
  const row = useAmenityRow(props);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
      <span className="flex min-w-0 grow flex-wrap items-center gap-x-2">
        <AmenityIcon icon={row.icon} />
        <span
          lang={row.name.lang}
          dir="auto"
          className={row.inactive ? 'text-muted-foreground' : undefined}
        >
          {row.name.text}
        </span>
        <span lang={row.other.lang} dir="auto" className="text-caption text-muted-foreground">
          {row.other.text}
        </span>
        {row.notFiltered && <Badge variant="neutral">{row.notFilteredLabel}</Badge>}
        {row.inactive && <Badge variant="warning">{row.inactiveLabel}</Badge>}
      </span>
      <RowControls controls={row.controls}>
        <LookupSheet sheet={row.edit} variant="ghost">
          {(close) => <EditAmenityForm amenity={props.amenity} onSaved={close} />}
        </LookupSheet>
      </RowControls>
      {row.failure && (
        <div className="basis-full">
          <FormFailure view={row.failure} />
        </div>
      )}
    </li>
  );
}
