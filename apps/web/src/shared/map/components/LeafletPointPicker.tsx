import '@shared/design-system/leaflet.css';
import { useCopy } from '@shared/copy';
import { directionOf, isolate, useLanguage } from '@shared/localisation';
import {
  divIcon,
  type LatLngBoundsExpression,
  type Map as LeafletMap,
  type Marker as LeafletMarker,
} from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import {
  AttributionControl,
  MapContainer,
  Marker,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { useTileStatus } from '../hooks/useTileStatus';
import { formatCoordinates } from '../services/coordinates';
import type { MapBounds } from '../types/MapBounds';
import type { MapPoint } from '../types/MapPoint';
import type { PointPickerProps } from '../types/PointPickerProps';
import { MapFailed } from './MapFailed';

// OpenStreetMap's standard tiles, in both themes, and the page its attribution links to.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const COPYRIGHT = 'https://www.openstreetmap.org/copyright';
const MAX_ZOOM = 19;

// The pin, drawn by the layer's stylesheet from the tokens (.map-pin), never Leaflet's default
// image. Its point, the drop's tip, is on the place.
const PIN = divIcon({
  className: 'map-pin',
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 34],
});

/** A box as Leaflet takes it: its south-west and north-east corners. */
function cornersOf({ south, north, west, east }: MapBounds, margin = 0): LatLngBoundsExpression {
  const lat = (north - south) * margin;
  const lng = (east - west) * margin;
  return [
    [south - lat, west - lng],
    [north + lat, east + lng],
  ];
}

/** The attribution, linked to OpenStreetMap's copyright page; Leaflet writes it as markup. */
function attributionOf(words: string): string {
  const text = words.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<a href="${COPYRIGHT}" target="_blank" rel="noreferrer">${text}</a>`;
}

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
  const language = useLanguage();
  const rtl = directionOf(language) === 'rtl';
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
          <TileLayer
            url={TILES}
            maxZoom={MAX_ZOOM}
            attribution={attributionOf(copy.map.attribution)}
            eventHandlers={tiles.handlers}
          />
          <ZoomControl
            position={rtl ? 'topright' : 'topleft'}
            zoomInTitle={copy.map.zoomIn}
            zoomOutTitle={copy.map.zoomOut}
          />
          <AttributionControl position={rtl ? 'bottomleft' : 'bottomright'} prefix={false} />
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
      {tiles.failed && <MapFailed />}
    </div>
  );
}
