import {
  LIVE_STATUSES,
  OVERRIDE_DURATIONS,
  type LiveStatus,
  type OverrideDuration,
} from '@masaha/shared/occupancy';
import { currentCopy, useCopy, type Catalogue } from '@shared/copy';
import { toast } from '@shared/design-system';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { isolate } from '@shared/localisation';
import { useEffect, useState } from 'react';
import { overrideLeft } from '../../services/overrideLeft';
import { useStateNowQuery } from '../now/useStateNowQuery';
import { useClearOverride } from './useClearOverride';
import { useSetOverride } from './useSetOverride';

// The override's time left is said to the minute: the clock is read again twice a minute.
const TICK_MS = 30_000;

const WORDS = { AVAILABLE: 'available', FULL: 'full', CLOSED: 'closedNow' } as const;

/** A live status in the catalogue's words: «متاح», «ممتلئ», «مغلق الآن». */
function stateWord(terms: Catalogue['terms'], state: LiveStatus): string {
  return terms.liveStatuses[WORDS[state]];
}

/** The trigger's colour: what visitors see. */
function toneOf(state: LiveStatus | null): 'success' | 'warning' | 'neutral' {
  if (state === 'AVAILABLE') return 'success';
  if (state === 'FULL') return 'warning';
  return 'neutral';
}

/**
 * The desk's control of the live status (P2), ready to render: the trigger says what visitors see,
 * and under an override that it was set by hand and how long it has left; it is disabled, with its
 * reason, while the space is closed now with no override. Its panel chooses a state and sets it for
 * 30 minutes, an hour, two hours or until closing, or returns to the automatic status while an
 * override is in force. Done, the panel closes and a toast says what visitors now see; a refusal,
 * `SPACE_NOT_OPEN` among them, is said in the panel, which stays open.
 */
export function useLiveStatusControl(spaceId: number) {
  const copy = useCopy();
  const words = copy.occupancy;
  const data = useStateNowQuery(spaceId).data;
  const set = useSetOverride(spaceId);
  const clear = useClearOverride(spaceId);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<LiveStatus | null>(null);
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const { view: failure } = useRefusalView(refusal, words.override.failed);

  const override = data?.override ?? null;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const shown = override?.state ?? data?.status ?? null;
  const word = shown === null ? words.status.none : stateWord(copy.terms, shown);
  const left = override === null ? null : overrideLeft(override.until, now);
  const state = chosen ?? shown ?? 'FULL';

  const changeOpen = (next: boolean) => {
    setOpen(next);
    setRefusal(null);
    setChosen(null);
  };
  const write = async (run: () => Promise<unknown>, done: () => string) => {
    setRefusal(null);
    try {
      await run();
      // The time left is read from now, not from the last tick: a new override shows its whole length.
      setNow(new Date());
      changeOpen(false);
      toast.success(done());
    } catch (error) {
      setRefusal(toAppError(error));
    }
  };

  return {
    open,
    setOpen: changeOpen,
    trigger: {
      label:
        left === null
          ? words.status.line({ state: isolate(word) })
          : words.status.manual({ state: isolate(word), left: isolate(left) }),
      word,
      name:
        left === null
          ? words.status.name({ state: isolate(word) })
          : words.status.manualName({ state: isolate(word), left: isolate(left) }),
      tone: toneOf(shown),
      disabled: data?.status === 'CLOSED' && override === null,
      reason: data?.status === 'CLOSED' && override === null ? words.override.closed : null,
    },
    panel: {
      title: words.override.title,
      states: LIVE_STATUSES.map((value) => ({ value, label: stateWord(copy.terms, value) })),
      state,
      choose: (value: LiveStatus) => {
        setChosen(value);
      },
      forLabel: words.override.for,
      durations: OVERRIDE_DURATIONS.map((duration: OverrideDuration) => ({
        value: duration,
        label: words.override.durations[duration],
        run: () =>
          write(
            () => set.mutateAsync({ state, duration }),
            () =>
              currentCopy().occupancy.override.done({
                state: isolate(stateWord(currentCopy().terms, state)),
              }),
          ),
      })),
      back:
        override === null
          ? null
          : {
              label: words.override.back,
              run: () =>
                write(
                  () => clear.mutateAsync(),
                  () => currentCopy().occupancy.override.cleared,
                ),
            },
      now:
        override === null || left === null
          ? null
          : words.override.now({
              state: isolate(stateWord(copy.terms, override.state)),
              left: isolate(left),
            }),
      note: override === null ? words.override.note : words.override.replaces,
      failure,
      busy: set.isPending || clear.isPending,
    },
  };
}

/** The live status's control, ready to render. */
export type LiveStatusControlView = ReturnType<typeof useLiveStatusControl>;
