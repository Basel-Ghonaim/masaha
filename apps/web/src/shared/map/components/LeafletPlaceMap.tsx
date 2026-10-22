import '@shared/design-system/leaflet.css';
import { useLanguage } from '@shared/localisation';
import { divIcon, type Marker as LeafletMarker } from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, Marker } from 'react-leaflet';
import { useTileStatus } from '../hooks/useTileStatus';
import type { PlaceMapProps } from '../types/PlaceMapProps';
import { MapFailed } from './MapFailed';
import { MapLayers, MAX_ZOOM } from './MapLayers';

/** How close the map opens on its place: a few streets around it. */
const PLACE_ZOOM = 16;

// The pin, drawn by the layer's stylesheet from the tokens (.map-pin), as the picker's. Its point,
// the drop's tip, is on the place.
const PIN = divIcon({
  className: 'map-pin',
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 34],
});

/**
 * One place's map, loaded lazily with Leaflet and its stylesheet: OpenStreetMap's tiles, the zoom at
 * the start and the attribution at the end in either language, inside a left-to-right map centred
 * on the place. The pin is a picture named by its label: not a button, not dragged, out of the tab
 * order. When the tiles fail, the caller's line says so under the map.
 */
export function LeafletPlaceMap(props: PlaceMapProps) {
  // A new language rebuilds the map, so its controls move and its words change.
  return <OnePlaceMap key={useLanguage()} {...props} />;
}

/** The place's pin: a picture named by its label, which Leaflet's element is given once it exists. */
function PlacePin({ point, label }: Pick<PlaceMapProps, 'point' | 'label'>) {
  const pin = useRef<LeafletMarker>(null);
  useEffect(() => {
    const element = pin.current?.getElement();
    element?.setAttribute('role', 'img');
    element?.setAttribute('aria-label', label);
  }, [label]);
  return <Marker ref={pin} position={point} icon={PIN} keyboard={false} interactive={false} />;
}

function OnePlaceMap({ point, label, failed }: PlaceMapProps) {
  const tiles = useTileStatus();

  return (
    <div className="flex flex-col gap-2">
      {/* Leaflet lays its map out left to right, in either language. */}
      <div dir="ltr">
        <MapContainer
          center={point}
          zoom={PLACE_ZOOM}
          maxZoom={MAX_ZOOM}
          keyboard={false}
          scrollWheelZoom={false}
          zoomControl={false}
          attributionControl={false}
          className="h-72 w-full"
        >
          <MapLayers tileEvents={tiles.handlers} />
          <PlacePin point={point} label={label} />
        </MapContainer>
      </div>
      {tiles.failed && <MapFailed line={failed} />}
    </div>
  );
}
