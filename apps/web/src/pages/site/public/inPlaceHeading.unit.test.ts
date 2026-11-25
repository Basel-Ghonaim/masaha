import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { inPlaceHeading } from './inPlaceHeading';

const english = CATALOGUES.en;

describe('inPlaceHeading', () => {
  it.each([
    ['favorite', 'Sign in to save spaces to your favourites'],
    ['report', 'Sign in to report information'],
  ] as const)('titles the sign-in by the action pressed (%s)', (reason, title) => {
    expect(inPlaceHeading(english, reason, 'signIn', 'loading').title).toBe(title);
    expect(inPlaceHeading(english, reason, 'changed', 'loading').title).toBe(title);
  });

  it.each([
    ['favorite', 'Create an account to save spaces to your favourites'],
    ['report', 'Create an account to report information'],
  ] as const)('keeps the reason in the register title (%s)', (reason, title) => {
    expect(inPlaceHeading(english, reason, 'register', 'loading')).toEqual({
      title,
      description: 'Save your favourite spaces and follow the reports you send.',
    });
  });

  it.each([
    ['request', 'Forgot password', true],
    ['loading', 'Forgot password', false],
    ['unreachable', 'Forgot password', false],
    ['sent', 'Check your email', false],
    ['linkOpen', 'You’ve opened a reset link', false],
  ] as const)(
    'titles the forgotten password by the server’s step (%s)',
    (step, title, described) => {
      const heading = inPlaceHeading(english, 'favorite', 'forgot', step);

      expect(heading.title).toBe(title);
      expect(heading.description !== undefined).toBe(described);
    },
  );
});
