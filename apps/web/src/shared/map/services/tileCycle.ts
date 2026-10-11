/**
 * Where a tile layer's loads stand: the failed tiles of the load under way, and whether the last
 * load that ended had any. A load is Leaflet's own cycle, from its `loading` to its `load`, which
 * comes once every tile asked for has loaded or failed (each pan or zoom asks for more).
 */
export type TileCycle = { errors: number; failed: boolean };

/** Leaflet's events that make a load: it starts, a tile fails, it ends. */
export type TileEvent = 'loading' | 'tileerror' | 'load';

/** A layer that has loaded nothing yet: no failure to show. */
export const FRESH_TILES: TileCycle = { errors: 0, failed: false };

/**
 * The state after `event`. A load counts its failed tiles from its start, and fails when any did,
 * whatever loaded beside it, or passes when none did; the last verdict holds while the next load is
 * under way.
 */
export function nextTileCycle(state: TileCycle, event: TileEvent): TileCycle {
  switch (event) {
    case 'loading':
      return { errors: 0, failed: state.failed };
    case 'tileerror':
      return { ...state, errors: state.errors + 1 };
    case 'load':
      return { ...state, failed: state.errors > 0 };
  }
}
