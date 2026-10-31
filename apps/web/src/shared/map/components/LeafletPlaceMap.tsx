import '@shared/design-system/leaflet.css';
import { useLanguage } from '@shared/localisation';
import { divIcon, latLngBounds, type Marker as LeafletMarker } from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, Marker, useMap } from 'react-leaflet';
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

// The visitor's point, as the map of many places draws it (.map-user).
const USER = divIcon({
  className: 'map-user',
  html: '<span></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/**
 * One place's map, loaded lazily with Leaflet and its stylesheet: OpenStreetMap's tiles, the zoom at
 * the start and the attribution at the end in either language, inside a left-to-right map centred
 * on the place. The pin is a picture named by its label: not a button, not dragged, out of the tab
 * order. With the visitor's point (`user`), it is drawn too, a picture named by its label, and the
 * map holds both. When the tiles fail, the caller's line says so under the map.
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

/** The visitor's point: a picture named by its label; the map is brought to hold it and the place. */
function UserPin({
  place,
  user,
}: {
  place: PlaceMapProps['point'];
  user: NonNullable<PlaceMapProps['user']>;
}) {
  const mark = useRef<LeafletMarker>(null);
  const map = useMap();
  useEffect(() => {
    const element = mark.current?.getElement();
    element?.setAttribute('role', 'img');
    element?.setAttribute('aria-label', user.label);
  }, [user.label]);
  const { lat, lng } = user.point;
  useEffect(() => {
    map.fitBounds(latLngBounds([place, { lat, lng }]), { padding: [32, 32], maxZoom: PLACE_ZOOM });
  }, [map, place, lat, lng]);
  return (
    <Marker
      ref={mark}
      position={user.point}
      icon={USER}
      keyboard={false}
      interactive={false}
      zIndexOffset={1000}
    />
  );
}

function OnePlaceMap({ point, label, failed, user = null }: PlaceMapProps) {
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
          dragging={false}
          touchZoom={false}
          zoomControl={false}
          attributionControl={false}
          className="h-72 w-full"
        >
          <MapLayers tileEvents={tiles.handlers} />
          <PlacePin point={point} label={label} />
          {user !== null && <UserPin place={point} user={user} />}
        </MapContainer>
      </div>
      {tiles.failed && <MapFailed line={failed} />}
    </div>
  );
}
