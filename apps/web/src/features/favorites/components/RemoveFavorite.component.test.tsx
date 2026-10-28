import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { establishSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { findToast } from '../../../test/findToast';
import { fakeTransport, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { RemoveFavorite } from './RemoveFavorite';

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

const lineOf = ({ method, url }: { method?: string; url?: string }) =>
  `${String(method)} ${String(url)}`;

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession(), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('RemoveFavorite', () => {
  it('removes a space that left, once, and says it cannot be saved again while out of the directory, with no «Undo»; axe-clean', async () => {
    const first = deferred<FakeAnswer>();
    const requests = fakeTransport((request) =>
      request.method === 'delete' ? first.promise : { status: 204 },
    );
    const { container } = render(
      <QueryClientProvider client={createQueryClient()}>
        <RemoveFavorite space={{ id: 9, name: { text: 'Old Hub' } }} manage={vi.fn()} />
        <Toaster label="Notifications" />
      </QueryClientProvider>,
    );

    const remove = screen.getByRole('button', { name: heard('Remove Old Hub from favourites') });
    expect(remove).toHaveTextContent('Remove');
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.click(remove);
    // Held while it is sent: a second press sends nothing more.
    expect(remove).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(remove);
    await act(async () => {
      first.resolve({ status: 204 });
      await first.promise;
    });
    // The API refuses to save a space out of the directory (404): no undo is offered.
    const line = await findToast(
      heard(
        'Old Hub removed from favourites. It can’t be saved again while it’s out of the directory.',
      ),
    );
    expect(remove).toHaveFocus();
    expect(within(line.closest('li') ?? document.body).queryByRole('button')).toBeNull();
    expect(requests.map(lineOf)).toEqual(['delete /me/favorites/9']);
  });
});
