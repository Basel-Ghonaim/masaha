import { useQueryClient } from '@tanstack/react-query';
import { judgePosition, pinnedPoint } from '../../services/nearPoint';
import type { NearState } from '../../types/NearState';
import { directoryKeys, hasNear, isNearFavorites } from '../queryKeys';
import { nearMeStore, useNearState } from './nearMeStore';

/** How the device is asked: precise, at most 8 s, a position up to 5 minutes old. */
const ASK = { enableHighAccuracy: true, timeout: 8000, maximumAge: 300_000 } as const;

/**
 * How long near me waits for any answer. The device's own timeout counts only once the permission
 * is given, and a permission prompt dismissed without a choice (as Firefox allows) answers nothing.
 */
const NO_ANSWER_MS = 15_000;

/**
 * «الأقرب إليّ»: asks for the device's location only when pressed, never on load, and keeps only its
 * rounded point, in memory. Pressed while sorting, it stops sorting and keeps the point; pressed
 * with a point, it sorts again without asking. A refusal, an unavailable location, or a position
 * too imprecise or outside the Strip keeps nothing; no answer within 15 s is a refusal, and an
 * answer after it is dropped. Clearing drops the point and every answer ordered by distance from it,
 * the user's favourites among them.
 * A point may instead be placed by hand on the map (U7): rounded and kept as the device's is, and
 * «رجوع» restores whatever was there before the pick.
 */
export function useNearMe(): {
  state: NearState;
  press: () => void;
  stop: () => void;
  clear: () => void;
  startPick: () => void;
  cancelPick: () => void;
  placePin: (point: { lat: number; lng: number }) => void;
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
      const asked = nearMeStore.locating();
      // The first of the answer and the wait settles the ask; whatever comes after is dropped.
      const settle = (write: () => void) => {
        if (!nearMeStore.awaits(asked)) return;
        clearTimeout(watchdog);
        write();
      };
      const watchdog = setTimeout(() => {
        settle(() => {
          nearMeStore.refused('denied');
        });
      }, NO_ANSWER_MS);
      geolocation.getCurrentPosition(
        (position) => {
          settle(() => {
            const judged = judgePosition(position.coords);
            if (judged.status === 'granted') nearMeStore.granted(judged.point, 'device');
            else nearMeStore.refused('imprecise');
          });
        },
        () => {
          settle(() => {
            nearMeStore.refused('denied');
          });
        },
        ASK,
      );
    },
    stop: nearMeStore.stopSorting,
    startPick: nearMeStore.startPick,
    cancelPick: nearMeStore.cancelPick,
    placePin: (point) => {
      nearMeStore.placePin(pinnedPoint(point));
    },
    clear: () => {
      nearMeStore.clear();
      client.removeQueries({
        queryKey: directoryKeys.all,
        predicate: (query) => hasNear(query.queryKey),
      });
      client.removeQueries({
        queryKey: ['me', 'favorites'],
        predicate: (query) => isNearFavorites(query.queryKey),
      });
    },
  };
}
