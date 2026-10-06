import type { AdminArea, AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { Badge } from '@shared/design-system';
import { useAreaRow } from '../../hooks/list/useAreaRow';
import { RowControls } from './RowControls';

/**
 * An area in its governorate's card: its names, English first, its badge when hidden, and its
 * controls, which wrap under the names on a narrow screen.
 */
export function AreaRow(props: {
  governorate: AdminGovernorateWithAreas;
  area: AdminArea;
  index: number;
  /** Its card waits out a 429. */
  blocked: boolean;
}) {
  const row = useAreaRow(props);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
      <span className="flex min-w-0 grow flex-wrap items-baseline gap-x-2">
        <span lang="en" dir="auto" className={row.hidden ? 'text-muted-foreground' : undefined}>
          {row.nameEn}
        </span>
        <span lang="ar" dir="auto" className="text-caption text-muted-foreground">
          {row.nameAr}
        </span>
        {row.hidden && <Badge variant="warning">{row.hiddenLabel}</Badge>}
      </span>
      <RowControls controls={row.controls} />
    </li>
  );
}
