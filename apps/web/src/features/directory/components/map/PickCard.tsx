import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import type { MarkerMapControls } from '@shared/map';
import { useEffect, useId } from 'react';
import type { DirectoryMapView } from '../../types/DirectoryMapView';

/**
 * Setting one's location by hand (U7): a region over the map with its title and its text, which
 * promises the point is sent rounded and never stored; «ثبّت الموقع هنا» places the map's centre,
 * «رجوع» restores what was there. On opening, the focus moves to the map, whose arrow keys pan it
 * under the crosshair.
 */
export function PickCard({
  pick,
  map,
}: {
  pick: NonNullable<DirectoryMapView['pick']>;
  map: MarkerMapControls;
}) {
  const titleId = useId();
  const { focusMap } = map;
  useEffect(() => {
    focusMap();
  }, [focusMap]);

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      className="pointer-events-auto w-full max-w-sm shadow-overlay"
    >
      <CardHeader>
        <CardTitle>
          <h2 id={titleId}>{pick.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-body-sm text-muted-foreground">{pick.text}</p>
      </CardContent>
      <CardFooter>
        <Button
          className="flex-1"
          onClick={() => {
            pick.place(map.centre());
          }}
        >
          {pick.confirm}
        </Button>
        <Button variant="ghost" onClick={pick.cancel}>
          {pick.back}
        </Button>
      </CardFooter>
    </Card>
  );
}
