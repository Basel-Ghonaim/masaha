import { DAY_MINUTES } from '@masaha/shared/spaces';
import { clockOf } from '@shared/lib';

/** The lists' step: a time is chosen every half hour (W5). */
const STEP = 30;

/** The half hours a range may start at: 00:00 to 23:30, as minutes after midnight. */
const STARTS = Array.from({ length: DAY_MINUTES / STEP }, (_, index) => index * STEP);

/** The half hours a range may end at: 00:30 to 24:00, the day's own end. */
const ENDS = STARTS.map((minute) => minute + STEP);

/** A list with a saved time off its grid kept in it, in its place. */
function keeping(list: readonly number[], saved: number | null): number[] {
  if (saved === null || list.includes(saved)) return [...list];
  return [...list, saved].sort((first, second) => first - second);
}

/**
 * The times a range's start is chosen from, every half hour; a saved time off the half hours, such
 * as 08:15, stays in the list in its place, so opening a Sheet changes nothing.
 */
export function startOptions(saved: number | null): number[] {
  return keeping(STARTS, saved);
}

/** The times a range's end is chosen from: 00:30 to 24:00, a saved time off them kept in place. */
export function endOptions(saved: number | null): number[] {
  return keeping(ENDS, saved);
}

/** A time's list, ready to render: its options as clocks, left to right, and its value. */
export type TimeChoice = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  choose: (option: string) => void;
  disabled: boolean;
};

/** A start's or an end's list (`end`) at `minute`, which hands the minute chosen to `write`. */
export function timeChoiceOf(
  label: string,
  minute: number,
  end: boolean,
  write: (minute: number) => void,
  disabled: boolean,
): TimeChoice {
  return {
    label,
    value: String(minute),
    options: (end ? endOptions(minute) : startOptions(minute)).map((option) => ({
      value: String(option),
      label: clockOf(option),
    })),
    choose: (option) => {
      write(Number(option));
    },
    disabled,
  };
}
