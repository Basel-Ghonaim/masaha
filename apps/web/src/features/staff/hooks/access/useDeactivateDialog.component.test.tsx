import type { StaffMember } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { DeactivateDialog } from '../../components/access/DeactivateDialog';
import { staffKeys } from '../queryKeys';

const RAHAF: StaffMember = {
  userId: 15,
  name: 'Rahaf',
  email: 'rahaf@example.com',
  isActive: true,
  temporaryPassword: null,
};

/** The deactivation of Rahaf at space 7, the list in the cache, the server answering with `answer`. */
function renderDialog(answer: () => FakeAnswer | Promise<FakeAnswer>) {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  client.setQueryData(staffKeys.list(7), [RAHAF]);
  const onClose = vi.fn();
  const opener = document.createElement('button');
  render(
    <QueryClientProvider client={client}>
      <DeactivateDialog
        spaceId={7}
        member={RAHAF}
        onClose={onClose}
        returnFocus={{ current: opener }}
      />
    </QueryClientProvider>,
  );
  return { requests, client, onClose, user: userEvent.setup() };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('the deactivation', () => {
  it('says every session ends, opens on «Back», and keeps its action until the answer', async () => {
    const answer = deferred<FakeAnswer>();
    const { requests, onClose, user } = renderDialog(() => answer.promise);

    // The name isolated inside the title, as a reader hears it without the marks.
    const dialog = screen.getByRole('alertdialog', {
      name: (name) => name.replace(/[\u2066-\u2069]/g, '') === 'Remove Rahaf’s access?',
    });
    expect(dialog).toHaveAccessibleDescription(
      'Every session of theirs ends on every device now, and they can’t reach this space until you give their access back. Their name stays on the payments and in the log.',
    );
    expect(screen.getByRole('button', { name: 'Back' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Remove access' }));

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(bodyOf(requests[0])).toEqual({ isActive: false });
    // Still there, waiting, until the server answers.
    expect(screen.getByRole('button', { name: 'Remove access' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    answer.resolve(ok({ ...RAHAF, isActive: false }));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps a refusal inside, in the owner’s words', async () => {
    const { onClose, user } = renderDialog(() => refused(404, { type: 'not_found' }));

    await user.click(screen.getByRole('button', { name: 'Remove access' }));

    expect(
      await screen.findByText(
        'This person is no longer on the space’s staff, or the space is no longer open to you.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('replaces the row with the answer, reading nothing again', async () => {
    const { requests, client, onClose, user } = renderDialog(() =>
      ok({ ...RAHAF, isActive: false }),
    );

    await user.click(screen.getByRole('button', { name: 'Remove access' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(client.getQueryData(staffKeys.list(7))).toEqual([{ ...RAHAF, isActive: false }]);
    expect(requests.filter(({ method }) => method === 'get')).toHaveLength(0);
  });
});
