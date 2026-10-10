import { useMemo, useReducer } from 'react';
import { FRESH_TILES, nextTileCycle } from '../services/tileCycle';

/**
 * Whether the map's tiles failed to load, judged on each of Leaflet's loads: a load in which any
 * tile failed shows the failure, as when the connection is down or the tile server is unreachable,
 * and a load in which none failed clears it. Hands back the tile layer's handlers that keep it. A
 * new layer, as when the map is rebuilt, starts with the hook that holds it.
 */
export function useTileStatus() {
  const [state, dispatch] = useReducer(nextTileCycle, FRESH_TILES);
  const handlers = useMemo(
    () => ({
      loading: () => {
        dispatch('loading');
      },
      tileerror: () => {
        dispatch('tileerror');
      },
      load: () => {
        dispatch('load');
      },
    }),
    [],
  );
  return { failed: state.failed, handlers };
}
