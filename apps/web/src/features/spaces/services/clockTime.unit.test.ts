import { describe, expect, it } from 'vitest';
import { minuteOf, settledClock } from './clockTime';

describe('minuteOf', () => {
  it('reads a time typed with or without its colon, in Western or Arabic digits', () => {
    expect(['8', '08', '8:00', '08:00'].map((text) => minuteOf(text, { end: false }))).toEqual([
      480, 480, 480, 480,
    ]);
    expect(['830', '0830', '8:30', '08:30'].map((text) => minuteOf(text, { end: false }))).toEqual([
      510, 510, 510, 510,
    ]);
    expect(minuteOf(' 23:59 ', { end: false })).toBe(1439);
    expect(minuteOf('٠٨:٣٠', { end: false })).toBe(510);
    expect(minuteOf('١٨٣٠', { end: true })).toBe(1110);
  });

  it('reads 24:00 only as a day’s end', () => {
    expect(minuteOf('24:00', { end: true })).toBe(1440);
    expect(minuteOf('2400', { end: true })).toBe(1440);
    expect(minuteOf('24:00', { end: false })).toBe('24:00');
    expect(minuteOf('24:30', { end: true })).toBe('24:30');
  });

  it('leaves what is no time as typed, and a blank as no value', () => {
    expect(minuteOf('', { end: false })).toBeUndefined();
    expect(minuteOf('   ', { end: true })).toBeUndefined();
    expect(minuteOf('23:60', { end: false })).toBe('23:60');
    expect(minuteOf('25', { end: true })).toBe('25');
    expect(minuteOf('8 am', { end: false })).toBe('8 am');
    expect(minuteOf('08:3', { end: false })).toBe('08:3');
  });
});

describe('settledClock', () => {
  it('rewrites a time it can read as HH:MM, and leaves anything else as typed', () => {
    expect(settledClock('830', { end: false })).toBe('08:30');
    expect(settledClock('٩', { end: false })).toBe('09:00');
    expect(settledClock('24', { end: true })).toBe('24:00');
    expect(settledClock('24', { end: false })).toBe('24');
    expect(settledClock('soon', { end: true })).toBe('soon');
    expect(settledClock('', { end: true })).toBe('');
  });
});
