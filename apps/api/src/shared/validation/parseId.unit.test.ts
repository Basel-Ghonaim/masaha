import { describe, expect, it } from 'vitest';

import { parseId } from './parseId.ts';

describe('parseId', () => {
  it.each([
    ['1', 1],
    ['42', 42],
    ['2147483647', 2_147_483_647],
  ])('reads %s as the id %d', (value, id) => {
    expect(parseId(value)).toBe(id);
  });

  it.each([
    '0',
    '-1',
    '01',
    '1.5',
    '1e3',
    ' 1',
    'abc',
    '',
    '2147483648',
    '99999999999',
    undefined,
    ['1'],
  ])('answers not_found for %j', (value) => {
    expect(() => parseId(value)).toThrow(expect.objectContaining({ type: 'not_found' }));
  });
});
