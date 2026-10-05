import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../test/startPreferences';
import { usePasswordRules } from './usePasswordRules';

/** Each rule's state, in the checklist's order. */
function states(value: string, invalid = false) {
  const { result } = renderHook(() => usePasswordRules(value, invalid));
  return result.current.rules.map(({ state }) => state);
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePasswordRules', () => {
  it('ticks each rule as the value comes to meet it', () => {
    expect(states('')).toEqual(['pending', 'pending', 'pending']);
    expect(states('gaza')).toEqual(['pending', 'met', 'pending']);
    expect(states('gaza202')).toEqual(['pending', 'met', 'met']);
    expect(states('gaza2026')).toEqual(['met', 'met', 'met']);
  });

  it('marks the rules not met as failed once the form was sent with them', () => {
    expect(states('gazagaza', true)).toEqual(['met', 'met', 'failed']);
  });

  it('words each rule, its state read aloud, and the list', () => {
    const { result } = renderHook(() => usePasswordRules('gaza', false));

    expect(result.current.label).toBe('Password rules');
    expect(result.current.rules.map(({ text, status }) => `${text} ${status}`)).toEqual([
      'At least 8 characters — not met yet',
      'At least one letter — met',
      'At least one number — not met yet',
    ]);
  });
});
