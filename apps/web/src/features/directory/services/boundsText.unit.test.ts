import { describe, expect, it } from 'vitest';
import { boundsText } from './boundsText';

describe('boundsText', () => {
  it('writes south,west,north,east', () => {
    expect(boundsText({ south: 31.4, west: 34.3, north: 31.55, east: 34.5 })).toBe(
      '31.4,34.3,31.55,34.5',
    );
  });
});
