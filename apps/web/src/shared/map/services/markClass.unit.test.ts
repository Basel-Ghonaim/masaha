import { describe, expect, it } from 'vitest';
import { markClass } from './markClass';

describe('markClass', () => {
  it('names a mark’s shape and tone, and the selected one by a ring', () => {
    expect(markClass({ shape: 'filled', tone: 'success' }, false)).toBe(
      'map-mark map-mark-filled map-tone-success',
    );
    expect(markClass({ shape: 'dashed', tone: 'muted' }, true)).toBe(
      'map-mark map-mark-dashed map-tone-muted map-mark-selected',
    );
  });
});
