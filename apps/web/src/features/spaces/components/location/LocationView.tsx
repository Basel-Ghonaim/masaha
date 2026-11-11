import { Button } from '@shared/design-system';
import { PlaceMap } from '@shared/map';
import type { ReactNode } from 'react';
import type { LocationSectionView } from '../../hooks/location/useLocationSection';

/** «الموقع» as a visitor reads it: the area, the addresses, the landmark, and the pin on a map. */
export function LocationView({
  view,
  areaLine,
}: {
  view: LocationSectionView;
  areaLine: ReactNode;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-label">{areaLine}</p>
        <p lang={view.address.lang} dir={view.address.dir} className="text-body break-words">
          {view.address.text}
        </p>
        {view.otherAddress && (
          <p
            lang={view.otherAddress.lang}
            dir={view.otherAddress.dir}
            className="text-body-sm text-muted-foreground break-words"
          >
            {view.otherAddress.text}
          </p>
        )}
        {view.landmark && (
          <p className="text-body-sm break-words">
            {view.landmark.label}{' '}
            <span lang={view.landmark.lang} dir={view.landmark.dir}>
              {view.landmark.text}
            </span>
          </p>
        )}
        {view.missingEnglish && (
          <p className="rounded-lg bg-warning-subtle px-3 py-2 text-body-sm text-warning-subtle-foreground">
            {view.missingEnglish}
          </p>
        )}
        <div>
          <Button variant="outline" size="sm" asChild>
            <a href={view.directions.href} target="_blank" rel="noreferrer">
              {view.directions.label}
            </a>
          </Button>
        </div>
      </div>
      <PlaceMap {...view.map} />
    </div>
  );
}
