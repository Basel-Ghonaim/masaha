import '@shared/design-system/leaflet.css';
import { cn } from '@shared/design-system';
import { useLanguage } from '@shared/localisation';
import {
  divIcon,
  latLng,
  type LeafletKeyboardEvent,
  type Map as LeafletMap,
  type Marker as LeafletMarker,
} from 'leaflet';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { useTileStatus } from '../hooks/useTileStatus';
import { boundsOf, cornersOf } from '../services/mapBox';
import { markClass } from '../services/markClass';
import type { MapPoint } from '../types/MapPoint';
import type { MapMarker, MarkerMapControls, MarkerMapProps } from '../types/MarkerMapProps';
import { MapFailed } from './MapFailed';
import { MapLayers, MAX_ZOOM } from './MapLayers';

/** A mark's size and its centre, on its place. */
const MARK_SIZE = 16;
/** How close «مركّز على موقعي» brings the map, at least. */
const USER_ZOOM = 14;

const USER_ICON = divIcon({
  className: 'map-user',
  html: '<span></span>',
  iconSize: [MARK_SIZE, MARK_SIZE],
  iconAnchor: [MARK_SIZE / 2, MARK_SIZE / 2],
});

/**
 * The map of many marks, loaded lazily with Leaflet and its stylesheet (docs/frontend/architecture.md
 * §6): OpenStreetMap's tiles, the zoom at the start and the attribution at the end, inside a
 * left-to-right box whose arrow keys pan the map. Each mark is a button named by its label, pressed
 * when selected, its name beside it on hover and always beside the selected one. When the tiles
 * fail, the caller's line says so under the map.
 */
export function LeafletMarkerMap(props: MarkerMapProps) {
  // A new language rebuilds the map, so its controls move and its words change, and its tiles are
  // judged afresh.
  return <MarksMap key={useLanguage()} {...props} />;
}

/** The map itself, with its tiles' status and the overlay; built anew for each language. */
function MarksMap({
  markers,
  selectedId,
  onSelect,
  bounds,
  user,
  focus,
  pick,
  onViewChange,
  label,
  failed,
  overlay,
  under,
}: MarkerMapProps) {
  const tiles = useTileStatus();
  const [map, setMap] = useState<LeafletMap | null>(null);
  const keysId = useId();
  const picking = pick !== null;

  // The map's container is what the keyboard pans: it is named, as an application of its own, and
  // while picking it is described by how the keys move it under the crosshair.
  useEffect(() => {
    const container = map?.getContainer();
    container?.setAttribute('role', 'application');
    container?.setAttribute('aria-label', label);
    if (picking) container?.setAttribute('aria-describedby', keysId);
    else container?.removeAttribute('aria-describedby');
  }, [map, label, picking, keysId]);

  const controls = useMemo<MarkerMapControls | null>(
    () =>
      map === null
        ? null
        : {
            centre: () => {
              const { lat, lng } = map.getCenter();
              return { lat, lng };
            },
            showUser: () => {
              if (user) map.setView(user.point, Math.max(map.getZoom(), USER_ZOOM));
            },
            focusMap: () => {
              map.getContainer().focus();
            },
            focusSelected: () => {
              map
                .getContainer()
                .querySelector<HTMLElement>('[role="button"][aria-pressed="true"]')
                ?.focus();
            },
          },
    [map, user],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className={cn('relative isolate', picking && 'map-picking')}>
        {/* The overlay comes first, so the caller's controls precede the marks in the tab order; it
            stands above the map's panes, on a layer kept inside this frame. */}
        {controls && (
          <div className="pointer-events-none absolute inset-0 z-sticky">{overlay(controls)}</div>
        )}
        {/* Leaflet lays its map out left to right, in either language. */}
        <div dir="ltr">
          <MapContainer
            ref={setMap}
            bounds={cornersOf(bounds)}
            maxBounds={cornersOf(bounds, 0.25)}
            maxZoom={MAX_ZOOM}
            zoomControl={false}
            attributionControl={false}
            className="h-120 w-full lg:h-160"
          >
            <MapLayers tileEvents={tiles.handlers} />
            {markers.map((marker) => (
              <PlaceMark
                key={marker.id}
                marker={marker}
                selected={marker.id === selectedId}
                picking={picking}
                onSelect={onSelect}
              />
            ))}
            {user && <UserMark point={user.point} label={user.label} />}
            <MapWatch onPick={pick?.onPick ?? null} onViewChange={onViewChange} />
            <FocusOn focus={focus} />
          </MapContainer>
        </div>
        {pick && (
          <>
            <span aria-hidden className="map-crosshair" />
            <p id={keysId} className="sr-only">
              {pick.keys}
            </p>
          </>
        )}
      </div>
      {controls && under?.(controls)}
      {tiles.failed && <MapFailed line={failed} />}
    </div>
  );
}

/**
 * One place's mark: a button named by its label and pressed when selected, chosen by a click, Enter
 * or Space. While picking, it leaves the tab order and is not chosen, and a tap passes to the map.
 */
function PlaceMark({
  marker,
  selected,
  picking,
  onSelect,
}: {
  marker: MapMarker;
  selected: boolean;
  picking: boolean;
  onSelect: (id: number) => void;
}) {
  const ref = useRef<LeafletMarker>(null);
  const { shape, tone } = marker.mark;
  const icon = useMemo(
    () =>
      divIcon({
        className: markClass({ shape, tone }, selected),
        html: '<span></span>',
        iconSize: [MARK_SIZE, MARK_SIZE],
        iconAnchor: [MARK_SIZE / 2, MARK_SIZE / 2],
      }),
    [shape, tone, selected],
  );

  // Leaflet makes the mark's element anew with each icon: it is named and set again each time.
  useEffect(() => {
    const element = ref.current?.getElement();
    if (!element) return;
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', marker.label);
    element.setAttribute('aria-pressed', String(selected));
    element.setAttribute('tabindex', picking ? '-1' : '0');
    if (picking) element.setAttribute('aria-hidden', 'true');
    else element.removeAttribute('aria-hidden');
  }, [icon, marker.label, selected, picking]);

  return (
    <Marker
      ref={ref}
      position={marker.point}
      icon={icon}
      keyboard
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{
        click: () => {
          if (!picking) onSelect(marker.id);
        },
        keydown: ({ originalEvent }: LeafletKeyboardEvent) => {
          if (picking || (originalEvent.key !== 'Enter' && originalEvent.key !== ' ')) return;
          originalEvent.preventDefault();
          onSelect(marker.id);
        },
      }}
    >
      {/* A permanent tooltip cannot become a passing one: each state has its own. */}
      <Tooltip
        key={String(selected)}
        className="map-tooltip"
        direction="top"
        offset={[0, -MARK_SIZE / 2]}
        permanent={selected}
      >
        <span aria-hidden dir="auto" lang={marker.name.lang}>
          {marker.name.text}
        </span>
      </Tooltip>
    </Marker>
  );
}

/** The visitor's point: a picture named by its label, never a button. */
function UserMark({ point, label }: { point: MapPoint; label: string }) {
  const ref = useRef<LeafletMarker>(null);
  useEffect(() => {
    const element = ref.current?.getElement();
    element?.setAttribute('role', 'img');
    element?.setAttribute('aria-label', label);
  }, [label]);
  return (
    <Marker
      ref={ref}
      position={point}
      icon={USER_ICON}
      keyboard={false}
      interactive={false}
      zIndexOffset={2000}
    />
  );
}

/** A tap on the map places the point while picking; each move hands back the box in view. */
function MapWatch({
  onPick,
  onViewChange,
}: {
  onPick: ((point: MapPoint) => void) | null;
  onViewChange: MarkerMapProps['onViewChange'];
}) {
  const map = useMapEvents({
    click: ({ latlng: { lat, lng } }) => {
      onPick?.({ lat, lng });
    },
    moveend: () => {
      onViewChange?.(boundsOf(map.getBounds()));
    },
  });
  return null;
}

/** Brings the focused point into view; `upper` puts it a quarter of the map above the centre. */
function FocusOn({ focus }: { focus: MarkerMapProps['focus'] }) {
  const map = useMap();
  const lat = focus?.point.lat;
  const lng = focus?.point.lng;
  const place = focus?.place;
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const target = latLng(lat, lng);
    if (place !== 'upper') {
      map.panTo(target);
      return;
    }
    const below = map.latLngToContainerPoint(target).add([0, map.getSize().y / 4]);
    map.panTo(map.containerPointToLatLng(below));
  }, [map, lat, lng, place]);
  return null;
}
