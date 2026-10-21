import { useCopy } from '@shared/copy';
import type { LocationStatusView } from '../../types/LocationStatusView';
import type { NearState } from '../../types/NearState';

/**
 * Near me's state line. The privacy line shows only where a location is being sent: while asking,
 * and while the list is sorted by distance; never once refused or imprecise (design issue 5). The
 * refused states offer choosing one's area instead.
 */
export function useLocationStatus({
  state,
  stop,
  clear,
  chooseArea,
}: {
  state: NearState;
  stop: () => void;
  clear: () => void;
  chooseArea: () => void;
}): LocationStatusView {
  const words = useCopy().directory.near;

  switch (state.status) {
    case 'idle':
      return { kind: 'none' };
    case 'locating':
      return { kind: 'locating', line: words.locating, privacy: words.privacy };
    case 'granted': {
      const sorting = state.sorting && state.source !== null;
      return {
        kind: 'granted',
        line: sorting && state.source !== null ? words.sorted[state.source] : null,
        approximate: sorting ? words.approximate : null,
        privacy: sorting ? words.privacy : null,
        stop: sorting ? { label: words.stop, run: stop } : null,
        clear: { label: words.clear, run: clear },
      };
    }
    case 'denied':
    case 'imprecise':
      return {
        kind: state.status,
        title: words[state.status].title,
        text: words[state.status].text,
        fallbacks: [{ label: words.chooseArea, run: chooseArea }],
      };
  }
}
