import { describe, expect, it } from 'vitest';
import { formatCoordinates, parseCoordinates } from './coordinates';

describe('parseCoordinates', () => {
  it.each([
    ['31.52, 34.45', { lat: 31.52, lng: 34.45 }],
    ['31.52,34.45', { lat: 31.52, lng: 34.45 }],
    ['31.52 34.45', { lat: 31.52, lng: 34.45 }],
    ['  31.5205,   34.4535  ', { lat: 31.5205, lng: 34.4535 }],
    ['-1.5, 2', { lat: -1.5, lng: 2 }],
    // As an Arabic keyboard types them: Arabic-Indic digits, the decimal separator and the comma.
    ['٣١٫٥٢، ٣٤٫٤٥', { lat: 31.52, lng: 34.45 }],
    ['٣١.٥٢،٣٤.٤٥', { lat: 31.52, lng: 34.45 }],
  ])('reads %j as a point', (text, point) => {
    expect(parseCoordinates(text)).toEqual(point);
  });

  it.each([
    '',
    '   ',
    '31.52',
    'a, b',
    '31.52, 34.45, 10',
    '91, 10',
    '10, 181',
    '31.52.1, 34.45',
    '1e2, 3',
  ])('reads no point from %j', (text) => {
    expect(parseCoordinates(text)).toBeNull();
  });
});

describe('formatCoordinates', () => {
  it('writes a point with five decimals, latitude first, in Western digits', () => {
    expect(formatCoordinates({ lat: 31.520512345, lng: 34.4535 })).toBe('31.52051, 34.45350');
  });

  it('reads back as the point it writes', () => {
    expect(parseCoordinates(formatCoordinates({ lat: 31.287654, lng: 34.25 }))).toEqual({
      lat: 31.28765,
      lng: 34.25,
    });
  });
});
