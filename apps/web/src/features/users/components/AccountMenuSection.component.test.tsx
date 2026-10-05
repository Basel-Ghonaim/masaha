import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { AccountMenuSection } from './AccountMenuSection';

const USER = aSession({ name: 'Sara Ahmad' }).user;

/** Renders the section, answered by `answer`; returns it. */
function renderSection(answer: () => FakeAnswer | Promise<FakeAnswer>) {
  fakeTransport(answer);
  render(<AccountMenuSection user={USER} />);
  return within(screen.getByRole('group', { name: 'Account' }));
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('AccountMenuSection', () => {
  it('shows a group named for the account, with the name and sign-out', () => {
    const section = renderSection(() => ({ status: 204 }));

    expect(section.getByText('Sara Ahmad')).toBeInTheDocument();
    expect(section.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  });

  it('marks sign-out busy while the server answers', async () => {
    const answer = deferred<FakeAnswer>();
    const section = renderSection(() => answer.promise);

    await userEvent.click(section.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(section.getByRole('button', { name: 'Sign out' })).toHaveAttribute(
        'aria-busy',
        'true',
      );
    });
    answer.resolve({ status: 204 });
  });

  it('shows why the sign-out failed under the button', async () => {
    const section = renderSection(() => ({ failure: 'ERR_NETWORK' }));

    await userEvent.click(section.getByRole('button', { name: 'Sign out' }));

    expect(await section.findByRole('alert')).toHaveTextContent('Couldn’t sign out');
  });
});
