import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { NearPoint, NearState } from '../../types/NearState';

const IDLE: NearState = { status: 'idle', point: null, source: null, sorting: false };

// Near me lives in memory only (S4): never persisted, never in the address. It holds the rounded
// point alone; the raw position never reaches it. Module-level, so Home, the Directory and a
// space's page share it, and a reload asks again.
const store = createStore<NearState>()(() => IDLE);

/** The writers of near me's state, the only way to change it. */
export const nearMeStore = {
  locating: () => {
    store.setState({ ...IDLE, status: 'locating' });
  },
  /** A rounded point, from the device or a pin; the lists sort by distance from it. */
  granted: (point: NearPoint, source: 'device' | 'pin') => {
    store.setState({ status: 'granted', point, source, sorting: true });
  },
  /** Denied or unavailable, or a position too imprecise or outside the Strip: nothing kept. */
  refused: (status: 'denied' | 'imprecise') => {
    store.setState({ ...IDLE, status });
  },
  stopSorting: () => {
    store.setState({ sorting: false });
  },
  sortAgain: () => {
    store.setState({ sorting: true });
  },
  /** Back to idle, with no point. */
  clear: () => {
    store.setState(IDLE);
  },
};

/** Near me's state now; the component renders again when it changes. */
export function useNearState(): NearState {
  return useStore(store);
}
