import { restoreSession } from '@shared/session';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { queryWrapper } from '../../../test/queryWrapper';
import { setSessionHint } from '../../../test/sessionHint';
import { startPreferences } from '../../../test/startPreferences';
import { useRequestLink } from './forgot-password/useRequestLink';
import { useGoogleSignIn } from './google-sign-in/useGoogleSignIn';
import { useRegister } from './register/useRegister';
import { useResendLink } from './resend-link/useResendLink';
import { useSignIn } from './sign-in/useSignIn';
import { useSignInBusy } from './useSignInBusy';

const SENT = { step: 'sent', email: 's•••@example.com', resendInSeconds: 60, canResend: true };

// Each mutation of a guest's sign-in, sent with what it takes, and what its server answers.
const MUTATIONS = [
  {
    name: 'a sign-in',
    useSend: () => useSignIn(),
    request: { email: 'sara@example.com', password: 'gaza2026' },
    answer: () => ok(aSession()),
  },
  {
    name: 'a registration',
    useSend: () => useRegister(),
    request: { name: 'Sara', email: 'sara@example.com', password: 'gaza2026', language: 'en' },
    answer: () => ok(aSession(), 201),
  },
  {
    name: 'a Google sign-in',
    useSend: () => useGoogleSignIn(),
    request: { idToken: 'google-id-token', language: 'en' },
    answer: () => ok({ ...aSession(), linked: false, created: false }),
  },
  {
    name: 'a reset link asked for',
    useSend: () => useRequestLink(),
    request: { email: 'sara@example.com' },
    answer: () => ok(SENT, 202),
  },
  {
    name: 'a reset link asked again',
    useSend: () => useResendLink(),
    request: undefined,
    answer: () => ok(SENT, 202),
  },
] as const;

beforeEach(() => {
  startPreferences('en');
});

afterEach(async () => {
  restoreTransport();
  // The sign-ins a test made end: with no hint, the restore finds no session.
  setSessionHint(false);
  await act(() => restoreSession());
});

describe('useSignInBusy', () => {
  it.each(MUTATIONS)(
    'is busy while $name is under way, and not before or after',
    async (mutation) => {
      const answer = deferred<FakeAnswer>();
      fakeTransport(() => answer.promise);
      const { result } = renderHook(
        () => ({ busy: useSignInBusy(), mutation: mutation.useSend() }),
        {
          wrapper: queryWrapper(),
        },
      );
      expect(result.current.busy).toBe(false);

      act(() => {
        // Each hook's mutate takes its own request; the busy state is what is read here.
        (result.current.mutation.mutate as (request: unknown) => void)(mutation.request);
      });
      await waitFor(() => {
        expect(result.current.busy).toBe(true);
      });

      answer.resolve(mutation.answer());
      await waitFor(() => {
        expect(result.current.busy).toBe(false);
      });
    },
  );
});
