import { describe, expect, it } from 'vitest';
import { wholeNumberOf } from './wholeNumber';

describe('wholeNumberOf', () => {
  it('reads Western and Arabic-Indic digits as the number, blank as none, and anything else as typed', () => {
    expect(wholeNumberOf(' 35 ')).toBe(35);
    expect(wholeNumberOf('٤٠')).toBe(40);
    expect(wholeNumberOf('  ')).toBeUndefined();
    expect(wholeNumberOf('4.5')).toBe('4.5');
    expect(wholeNumberOf('-3')).toBe('-3');
  });
});
