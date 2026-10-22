import '@shared/design-system/leaflet.css';
import { useCopy } from '@shared/copy';
import { isolate, useLanguage } from '@shared/localisation';
import { divIcon, type Map as LeafletMap, type Marker as LeafletMarker } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { useTileStatus } from '../hooks/useTileStatus';
import { formatCoordinates } from '../services/coordinates';
import { cornersOf } from '../services/mapBox';
import type { MapPoint } from '../types/MapPoint';
import type { PointPickerProps } from '../types/PointPickerProps';
import { MapFailed } from './MapFailed';
import { MapLayers, MAX_ZOOM } from './MapLayers';

// The pin, drawn by the layer's stylesheet from the tokens (.map-pin), never Leaflet's default
// image. Its point, the drop's tip, is on the place.
const PIN = divIcon({
  className: 'map-pin',
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 34],
});

/** Places the pin where the map is clicked. */
function ClickToPlace({ onPlace }: { onPlace: (point: MapPoint) => void }) {
  useMapEvents({
    click: ({ latlng: { lat, lng } }) => {
      onPlace({ lat, lng });
    },
  });
  return null;
}

/** Brings the pin into view when it moves out of it, as when its coordinates are typed. */
function FollowPin({ value }: { value: MapPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (value && !map.getBounds().contains(value)) map.panTo(value);
  }, [map, value]);
  return null;
}

/**
 * The point picker's map, loaded lazily with Leaflet and its stylesheet (docs/frontend/
 * architecture.md §6): OpenStreetMap's tiles, the zoom at the start and the attribution at the end
 * in either language, inside a left-to-right map. A click places the pin and a drag moves it; the
 * pin is named by its coordinates. When the tiles fail, a line says so under the map.
 */
export function LeafletPointPicker(props: PointPickerProps) {
  // A new language rebuilds the map, so its controls move and its words change, and its tiles are
  // judged afresh.
  return <PickerMap key={useLanguage()} {...props} />;
}

/** The map itself, with its tiles' status; built anew for each language. */
function PickerMap({ value, onChange, bounds, label }: PointPickerProps) {
  const copy = useCopy();
  const tiles = useTileStatus();
  const [map, setMap] = useState<LeafletMap | null>(null);
  const marker = useRef<LeafletMarker>(null);
  const pinName = value ? copy.map.pin({ point: isolate(formatCoordinates(value)) }) : '';

  // The map's container is what the keyboard pans: it is named, as an application of its own.
  useEffect(() => {
    const container = map?.getContainer();
    container?.setAttribute('role', 'application');
    container?.setAttribute('aria-label', label);
  }, [map, label]);
  // Leaflet names the pin once, when it is made; a new point renames it.
  useEffect(() => {
    marker.current?.getElement()?.setAttribute('title', pinName);
  }, [pinName]);

  return (
    <div className="flex flex-col gap-2">
      {/* Leaflet lays its map out left to right, in either language. */}
      <div dir="ltr">
        <MapContainer
          ref={setMap}
          bounds={cornersOf(bounds)}
          maxBounds={cornersOf(bounds, 0.25)}
          maxZoom={MAX_ZOOM}
          zoomControl={false}
          attributionControl={false}
          className="h-100 w-full"
        >
          <MapLayers tileEvents={tiles.handlers} />
          <ClickToPlace onPlace={onChange} />
          <FollowPin value={value} />
          {value && (
            <Marker
              ref={marker}
              position={value}
              icon={PIN}
              title={pinName}
              draggable
              eventHandlers={{
                dragend: () => {
                  const point = marker.current?.getLatLng();
                  if (point) onChange({ lat: point.lat, lng: point.lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      {tiles.failed && <MapFailed line={copy.map.failed} />}
    </div>
  );
}
