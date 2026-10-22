import { describe, expect, it } from 'vitest';
import { judgePosition, nearHeader, pinnedPoint, roundedPoint } from './nearPoint';

describe('nearPoint', () => {
  it('rounds a point placed by hand, and holds it inside the Strip’s box', () => {
    expect(pinnedPoint({ lat: 31.523_456, lng: 34.441_789 })).toEqual({ lat: 31.523, lng: 34.442 });
    expect(pinnedPoint({ lat: 31.7, lng: 34.1 })).toEqual({ lat: 31.64, lng: 34.17 });
  });

  it('rounds a point to three decimals', () => {
    expect(roundedPoint({ latitude: 31.521_449_7, longitude: 34.452_550_1 })).toEqual({
      lat: 31.521,
      lng: 34.453,
    });
    expect(nearHeader({ lat: 31.521, lng: 34.453 })).toBe('31.521,34.453');
  });

  it('keeps only the rounded point of a precise position in the Strip', () => {
    expect(judgePosition({ latitude: 31.501_234, longitude: 34.466_789, accuracy: 30 })).toEqual({
      status: 'granted',
      point: { lat: 31.501, lng: 34.467 },
    });
    expect(judgePosition({ latitude: 31.5, longitude: 34.46, accuracy: 2000 })).toMatchObject({
      status: 'granted',
    });
  });

  it('refuses a position less precise than 2 km, or outside the Strip', () => {
    expect(judgePosition({ latitude: 31.5, longitude: 34.46, accuracy: 2001 })).toEqual({
      status: 'imprecise',
    });
    expect(judgePosition({ latitude: 30.044, longitude: 31.236, accuracy: 20 })).toEqual({
      status: 'imprecise',
    });
  });
});
