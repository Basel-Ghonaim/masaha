import { describe, expect, it } from 'vitest';
import { sortableStep } from './sortableKeys';

describe('sortableStep', () => {
  it('moves forward with the left arrow in a right-to-left grid, back with the right', () => {
    expect(sortableStep(1, 4, 'ArrowLeft', 'grid', 'rtl')).toBe(2);
    expect(sortableStep(1, 4, 'ArrowRight', 'grid', 'rtl')).toBe(0);
  });

  it('moves forward with the right arrow in a left-to-right grid, back with the left', () => {
    expect(sortableStep(1, 4, 'ArrowRight', 'grid', 'ltr')).toBe(2);
    expect(sortableStep(1, 4, 'ArrowLeft', 'grid', 'ltr')).toBe(0);
  });

  it('takes no left or right step in a list, in either direction', () => {
    expect(sortableStep(1, 4, 'ArrowLeft', 'list', 'rtl')).toBeNull();
    expect(sortableStep(1, 4, 'ArrowRight', 'list', 'rtl')).toBeNull();
    expect(sortableStep(1, 4, 'ArrowRight', 'list', 'ltr')).toBeNull();
    expect(sortableStep(1, 4, 'ArrowLeft', 'list', 'ltr')).toBeNull();
  });

  it.each(['grid', 'list'] as const)('moves by one up and down in a %s', (layout) => {
    expect(sortableStep(1, 4, 'ArrowDown', layout, 'rtl')).toBe(2);
    expect(sortableStep(1, 4, 'ArrowUp', layout, 'ltr')).toBe(0);
  });

  it('goes to the ends with Home and End', () => {
    expect(sortableStep(2, 4, 'Home', 'list', 'rtl')).toBe(0);
    expect(sortableStep(1, 4, 'End', 'grid', 'ltr')).toBe(3);
  });

  it('stays at the ends rather than past them', () => {
    expect(sortableStep(0, 4, 'ArrowUp', 'list', 'rtl')).toBe(0);
    expect(sortableStep(3, 4, 'ArrowLeft', 'grid', 'rtl')).toBe(3);
  });

  it('takes no step for another key', () => {
    expect(sortableStep(1, 4, 'a', 'grid', 'rtl')).toBeNull();
  });
});
