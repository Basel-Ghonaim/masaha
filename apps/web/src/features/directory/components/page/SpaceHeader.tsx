import { CircleCheckIcon } from '@shared/design-system';
import type { ReactNode } from 'react';
import type { SpacePageView } from '../../types/SpacePageView';

/**
 * The page's head: the space's name as its one `h1` (marked when it is not in the interface's
 * language), its other name under it, its area, «موثّقة», and «لا توجد صور بعد» with no photo. The
 * title row holds the name and the page's action beside it, the heart (PU-014).
 */
export function SpaceHeader({
  header,
  areaName,
  action,
}: {
  header: NonNullable<SpacePageView['header']>;
  areaName: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <h1 className="min-w-0 text-heading-1" lang={header.name.lang} dir={header.name.dir}>
          {header.name.text}
        </h1>
        {action !== undefined && <div className="shrink-0">{action}</div>}
      </div>
      {header.other !== null && (
        <p
          className="text-body text-muted-foreground"
          lang={header.other.lang}
          dir={header.other.dir}
        >
          {header.other.text}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
        <p>{areaName}</p>
        {header.verified !== null && (
          <p className="flex items-center gap-1 text-primary">
            <CircleCheckIcon aria-hidden className="size-4" />
            {header.verified}
          </p>
        )}
        {header.noPhotos !== null && <p>{header.noPhotos}</p>}
      </div>
    </div>
  );
}
