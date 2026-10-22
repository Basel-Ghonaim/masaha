import { Button } from '@shared/design-system';
import { PlaceMap } from '@shared/map';
import type { SpacePageView } from '../../types/SpacePageView';
import { Section } from './Section';

/**
 * «الموقع»: the space on a map, its pin a picture (PU-026), the address and the landmark, and
 * «الاتجاهات» to the visitor's maps in a new tab.
 */
export function LocationSection({ location }: { location: SpacePageView['location'] }) {
  return (
    <Section title={location.title} meta={null}>
      <PlaceMap point={location.point} label={location.mapLabel} failed={location.failed} />
      <div className="flex flex-col gap-1 text-body-sm">
        {location.address !== null && (
          <p lang={location.address.lang} dir={location.address.dir}>
            {location.address.text}
          </p>
        )}
        {location.landmark !== null && (
          <p
            className="text-muted-foreground"
            lang={location.landmark.lang}
            dir={location.landmark.dir}
          >
            {location.landmark.text}
          </p>
        )}
      </div>
      <Button asChild variant="outline" size="sm" className="self-start">
        <a href={location.directions.href} target="_blank" rel="noopener">
          {location.directions.label}
        </a>
      </Button>
    </Section>
  );
}
