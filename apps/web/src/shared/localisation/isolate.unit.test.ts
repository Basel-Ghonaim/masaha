import { describe, expect, it } from 'vitest';
import { isolate } from './isolate';

describe('isolate', () => {
  it('wraps the value in the first-strong isolate and its pop', () => {
    expect(isolate('سارة')).toBe('⁨سارة⁩');
  });
});
