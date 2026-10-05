import { createQueryClient } from '@shared/api';
import { establishSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { ForcedPasswordChangeForm } from './ForcedPasswordChangeForm';

/** The form, with its own QueryClient, answered by `answer`. */
function renderForm(answer: () => FakeAnswer | Promise<FakeAnswer>) {
  fakeTransport(answer);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <ForcedPasswordChangeForm />
    </QueryClientProvider>,
  );
}

async function typeAndSave(password = 'mine2026x') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('New password'), password);
  await user.click(screen.getByRole('button', { name: 'Save and continue' }));
}

/** Each password rule as assistive technology reads it. */
function rulesRead() {
  const list = screen.getByRole('list', { name: 'Password rules' });
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession({ mustChangePassword: true }), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('ForcedPasswordChangeForm', () => {
  it('labels the new password, describes it by its rules, and shows them for what is typed', async () => {
    renderForm(() => ok({ accessToken: 'token-renewed' }));

    await userEvent.type(screen.getByLabelText('New password'), 'mine');

    expect(screen.getByLabelText('New password')).toHaveAccessibleDescription(
      /At least 8 characters.*At least one letter.*At least one number/,
    );
    expect(rulesRead()).toEqual([
      'At least 8 characters — not met yet',
      'At least one letter — met',
      'At least one number — not met yet',
    ]);
  });

  it('marks a password that fails the rules, and focuses it', async () => {
    renderForm(() => ok({ accessToken: 'token-renewed' }));

    await typeAndSave('mine');

    const field = screen.getByLabelText('New password');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveFocus();
  });

  it('disables the field while the server answers', async () => {
    const answer = deferred<FakeAnswer>();
    renderForm(() => answer.promise);

    await typeAndSave();

    await waitFor(() => {
      expect(screen.getByLabelText('New password')).toBeDisabled();
    });
    answer.resolve(ok({ accessToken: 'token-renewed' }));
  });

  it('shows why the change failed, under its title, as an alert', async () => {
    renderForm(() => refused(503, { type: 'service_unavailable' }));

    await typeAndSave();

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t save the password');
  });
});
