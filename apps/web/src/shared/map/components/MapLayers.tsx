import { useCopy } from '@shared/copy';
import { directionOf, useLanguage } from '@shared/localisation';
import type { LeafletEventHandlerFnMap } from 'leaflet';
import { AttributionControl, TileLayer, ZoomControl } from 'react-leaflet';

// OpenStreetMap's standard tiles, in both themes, and the page its attribution links to.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const COPYRIGHT = 'https://www.openstreetmap.org/copyright';

/** The deepest zoom the tiles offer. */
export const MAX_ZOOM = 19;

/** The attribution, linked to OpenStreetMap's copyright page; Leaflet writes it as markup. */
function attributionOf(words: string): string {
  const text = words.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<a href="${COPYRIGHT}" target="_blank" rel="noreferrer">${text}</a>`;
}

/**
 * Every map's tiles and controls: OpenStreetMap's tiles, whose loads `tileEvents` follows, the zoom
 * at the start and the attribution at the end in either language, named in it.
 */
export function MapLayers({ tileEvents }: { tileEvents: LeafletEventHandlerFnMap }) {
  const copy = useCopy();
  const rtl = directionOf(useLanguage()) === 'rtl';

  return (
    <>
      <TileLayer
        url={TILES}
        maxZoom={MAX_ZOOM}
        attribution={attributionOf(copy.map.attribution)}
        eventHandlers={tileEvents}
      />
      <ZoomControl
        position={rtl ? 'topright' : 'topleft'}
        zoomInTitle={copy.map.zoomIn}
        zoomOutTitle={copy.map.zoomOut}
      />
      <AttributionControl position={rtl ? 'bottomleft' : 'bottomright'} prefix={false} />
    </>
  );
}
