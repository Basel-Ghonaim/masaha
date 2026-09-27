import { describe, expect, it } from 'vitest';

import { assertTestDatabase } from './assert-test-database.ts';

describe('assertTestDatabase', () => {
  it('accepts a database whose name ends in _test', () => {
    expect(() => {
      assertTestDatabase('masaha_test');
    }).not.toThrow();
  });

  it.each(['masaha_dev', 'masaha', 'postgres', 'masaha_test_copy', 'test'])(
    'refuses %s, naming it',
    (name) => {
      expect(() => {
        assertTestDatabase(name);
      }).toThrow(`"${name}"`);
    },
  );
});
