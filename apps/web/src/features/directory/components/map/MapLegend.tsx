import { MapMarkSample } from '@shared/map';
import type { DirectoryMapView } from '../../types/DirectoryMapView';

/** The map's legend, in the map: each live state's mark beside its word, a list named by its title. */
export function MapLegend({ legend }: { legend: DirectoryMapView['legend'] }) {
  return (
    <ul
      aria-label={legend.label}
      className="flex flex-col gap-1 rounded-lg border border-border bg-card p-2 text-caption text-card-foreground shadow-raised"
    >
      {legend.items.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          <MapMarkSample mark={item.mark} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
