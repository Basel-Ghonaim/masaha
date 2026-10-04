import { describe, expect, it } from 'vitest';
import { parseSpaceId, spaceDeskPath, spaceOverviewPath } from './dashboardPaths';

describe('the dashboard paths', () => {
  it('put the space’s id in its overview’s and its desk’s paths', () => {
    expect(spaceOverviewPath(7)).toBe('/dashboard/spaces/7');
    expect(spaceDeskPath(7)).toBe('/dashboard/spaces/7/desk');
  });
});

describe('parseSpaceId', () => {
  it('reads a positive integer as written', () => {
    expect(parseSpaceId('7')).toBe(7);
    expect(parseSpaceId('120')).toBe(120);
  });

  it.each(['0', '-3', '07', '1.5', '1e3', ' 7', 'abc', '', '99999999999999999999'])(
    'reads %j as no space id',
    (param) => {
      expect(parseSpaceId(param)).toBeUndefined();
    },
  );

  it('reads a missing parameter as no space id', () => {
    expect(parseSpaceId(undefined)).toBeUndefined();
  });
});
