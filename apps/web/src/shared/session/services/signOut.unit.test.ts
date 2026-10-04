import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { aSession, appError, fakeSessionRepository, fakeHint } from '../../../test/fakeSession';
import { signOut } from './signOut';
import { establishSession, getSession, onSessionEnded } from '../store';

function signedIn() {
  establishSession(aSession(), { source: 'signIn' });
  const ended = vi.fn();
  onTestFinished(onSessionEnded(ended));
  return { ended };
}

describe('signOut', () => {
  it('ends the session, clears the hint and runs the ended listeners once the server agrees', async () => {
    const { ended } = signedIn();
    const hint = fakeHint(true);
    const repository = fakeSessionRepository();

    await signOut({ repository, hint });

    expect(repository.logout).toHaveBeenCalledOnce();
    expect(getSession().status).toBe('anonymous');
    expect(hint.clear).toHaveBeenCalledOnce();
    expect(ended).toHaveBeenCalledOnce();
  });

  it('ends the session, runs the other listeners and logs the error when an ended listener throws', async () => {
    signedIn();
    const failure = new Error('A listener failed');
    onTestFinished(
      onSessionEnded(() => {
        throw failure;
      }),
    );
    const after = vi.fn();
    onTestFinished(onSessionEnded(after));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    onTestFinished(() => {
      logged.mockRestore();
    });

    await expect(
      signOut({ repository: fakeSessionRepository(), hint: fakeHint(true) }),
    ).resolves.toBeUndefined();

    expect(getSession().status).toBe('anonymous');
    expect(after).toHaveBeenCalledOnce();
    expect(logged).toHaveBeenCalledExactlyOnceWith(failure);
  });

  it.each([
    ['network', 0],
    ['server', 500],
  ] as const)(
    'keeps the session and the hint, and rejects, on a %s failure',
    async (type, status) => {
      const { ended } = signedIn();
      const hint = fakeHint(true);
      const repository = fakeSessionRepository({
        logout: () => Promise.reject(appError(type, status)),
      });

      await expect(signOut({ repository, hint })).rejects.toMatchObject({ type });

      expect(getSession().status).toBe('authenticated');
      expect(hint.clear).not.toHaveBeenCalled();
      expect(ended).not.toHaveBeenCalled();
    },
  );
});
