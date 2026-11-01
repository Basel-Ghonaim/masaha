import { describe, expect, it } from 'vitest';
import { reportIdOf } from './reportIdOf';

describe('reportIdOf', () => {
  it('reads a positive whole number', () => {
    expect(reportIdOf('42')).toBe(42);
  });

  it('reads nothing else', () => {
    for (const text of [null, '', '0', '-3', '4.5', '12a', '007', '99999999999999999999']) {
      expect(reportIdOf(text)).toBeUndefined();
    }
  });
});
