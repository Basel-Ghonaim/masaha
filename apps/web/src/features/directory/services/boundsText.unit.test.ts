import { describe, expect, it } from 'vitest';
import { boundsText } from './boundsText';

describe('boundsText', () => {
  it('writes south,west,north,east', () => {
    expect(boundsText({ south: 31.4, west: 34.3, north: 31.55, east: 34.5 })).toBe(
      '31.4,34.3,31.55,34.5',
    );
  });

  it('rounds the box outward to two decimals, so it never carries a point to the metre', () => {
    expect(
      boundsText({ south: 31.412_345, west: 34.345_678, north: 31.551_234, east: 34.500_001 }),
    ).toBe('31.41,34.34,31.56,34.51');
    expect(boundsText({ south: -0.001, west: 34.3, north: 31.559_999, east: 34.5 })).toBe(
      '-0.01,34.3,31.56,34.5',
    );
  });
});
