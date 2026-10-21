import { useQueryClient } from '@tanstack/react-query';
import { judgePosition } from '../../services/nearPoint';
import type { NearState } from '../../types/NearState';
import { directoryKeys, hasNear } from '../queryKeys';
import { nearMeStore, useNearState } from './nearMeStore';

/** How the device is asked: precise, at most 8 s, a position up to 5 minutes old. */
const ASK = { enableHighAccuracy: true, timeout: 8000, maximumAge: 300_000 } as const;

/**
 * «الأقرب إليّ»: asks for the device's location only when pressed, never on load, and keeps only its
 * rounded point, in memory. Pressed while sorting, it stops sorting and keeps the point; pressed
 * with a point, it sorts again without asking. A refusal, an unavailable location, or a position
 * too imprecise or outside the Strip keeps nothing. Clearing drops the point and every answer
 * ordered by distance from it.
 */
export function useNearMe(): {
  state: NearState;
  press: () => void;
  stop: () => void;
  clear: () => void;
} {
  const state = useNearState();
  const client = useQueryClient();

  return {
    state,
    press: () => {
      if (state.status === 'locating') return;
      if (state.sorting) {
        nearMeStore.stopSorting();
        return;
      }
      if (state.point !== null) {
        nearMeStore.sortAgain();
        return;
      }
      // The browser's own seam: absent where the platform offers no location.
      const geolocation = navigator.geolocation as Geolocation | undefined;
      if (geolocation === undefined) {
        nearMeStore.refused('denied');
        return;
      }
      nearMeStore.locating();
      geolocation.getCurrentPosition(
        (position) => {
          const judged = judgePosition(position.coords);
          if (judged.status === 'granted') nearMeStore.granted(judged.point, 'device');
          else nearMeStore.refused('imprecise');
        },
        () => {
          nearMeStore.refused('denied');
        },
        ASK,
      );
    },
    stop: nearMeStore.stopSorting,
    clear: () => {
      nearMeStore.clear();
      client.removeQueries({
        queryKey: directoryKeys.all,
        predicate: (query) => hasNear(query.queryKey),
      });
    },
  };
}
