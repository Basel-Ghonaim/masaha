import { describe, expect, it } from 'vitest';
import { stayText } from './stayText';

describe('stayText', () => {
  it('writes 252 minutes as 4:12, and 5 as 0:05', () => {
    expect(stayText(252)).toBe('4:12');
    expect(stayText(5)).toBe('0:05');
  });
});
