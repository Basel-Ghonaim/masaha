import { describe, expect, it } from 'vitest';
import { sortableTransition } from './sortableMotion';

describe('sortableTransition', () => {
  it('reads the slide’s duration from the layer’s token, which reduced motion sets to 0', () => {
    expect(sortableTransition('transform 250ms var(--easing-standard)')).toBe(
      'transform var(--duration-medium) var(--easing-standard)',
    );
  });

  it('keeps dnd-kit’s instant transition, and none when there is none', () => {
    expect(sortableTransition('transform 0ms linear')).toBe('transform 0ms linear');
    expect(sortableTransition(null)).toBeUndefined();
  });
});
