import { describe, expect, it } from 'vitest';
import { endOptions, startOptions, timeChoiceOf } from './timeOptions';

describe('startOptions and endOptions', () => {
  it('offers 48 starts, every half hour from 00:00 to 23:30', () => {
    const starts = startOptions(null);

    expect(starts).toHaveLength(48);
    expect(starts.slice(0, 3)).toEqual([0, 30, 60]);
    expect(starts.at(-1)).toBe(1410);
  });

  it('offers 48 ends, from 00:30 to 24:00, the day’s own end', () => {
    const ends = endOptions(null);

    expect(ends).toHaveLength(48);
    expect(ends[0]).toBe(30);
    expect(ends.at(-1)).toBe(1440);
  });

  it('keeps a saved time off the half hours in its list, in its place', () => {
    const starts = startOptions(495);

    expect(starts).toHaveLength(49);
    expect(starts.slice(16, 19)).toEqual([480, 495, 510]);
    expect(endOptions(1080)).toHaveLength(48);
  });
});

describe('timeChoiceOf', () => {
  it('names each option as a clock and hands the minute chosen back', () => {
    const chosen: number[] = [];
    const choice = timeChoiceOf('From', 495, false, (minute) => chosen.push(minute), false);

    expect(choice.value).toBe('495');
    expect(choice.options[17]).toEqual({ value: '495', label: '08:15' });
    choice.choose('540');
    expect(chosen).toEqual([540]);
  });
});
