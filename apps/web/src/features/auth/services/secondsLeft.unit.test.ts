import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { secondsLeft } from './secondsLeft';

beforeEach(() => {
  vi.useFakeTimers({ now: 100_000 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('secondsLeft', () => {
  it('counts what is left of the window, in whole seconds rounded up', () => {
    expect(secondsLeft(60, 100_000 - 20_500)).toBe(40);
  });

  it('has nothing left once the window has passed', () => {
    expect(secondsLeft(60, 100_000 - 61_000)).toBe(0);
  });
});
