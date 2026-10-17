import { describe, expect, it } from 'vitest';
import { fitInside } from './photoGeometry';

describe('fitInside', () => {
  it('fits a photo inside the longest side it is given, and never enlarges one', () => {
    expect(fitInside(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    // A portrait's longest side is its height, not its width.
    expect(fitInside(1200, 2000, 1600)).toEqual({ width: 960, height: 1600 });
    expect(fitInside(1600, 1600, 1600)).toEqual({ width: 1600, height: 1600 });
    expect(fitInside(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('keeps a side whole that rounding would take below a pixel', () => {
    expect(fitInside(3, 1000, 10)).toEqual({ width: 1, height: 10 });
  });

  it('never leaves a side at nothing, whatever the longest side is given', () => {
    expect(fitInside(0, 0, 0)).toEqual({ width: 1, height: 1 });
  });
});
