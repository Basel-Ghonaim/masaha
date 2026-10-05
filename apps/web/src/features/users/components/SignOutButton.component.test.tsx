import { establishSession } from '@shared/session';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { SignOutButton } from './SignOutButton';

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession(), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('SignOutButton', () => {
  it('is a button named Sign out', () => {
    render(<SignOutButton />);

    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  });

  it('is disabled while the server signs out', async () => {
    const answer = deferred<FakeAnswer>();
    fakeTransport(() => answer.promise);
    render(<SignOutButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(screen.getByRole('button', { name: /Sign out/ })).toBeDisabled();
    answer.resolve({ status: 204 });
  });

  it('shows why the sign-out failed beneath it, as an alert', async () => {
    fakeTransport(() => ({ failure: 'ERR_NETWORK' }));
    render(<SignOutButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Couldn’t sign outNo connection. Check your internet and try again.',
    );
  });
});
