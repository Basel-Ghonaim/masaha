import { Toaster, toast } from '@shared/design-system';
import { useQuery } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { bodyOf, fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useRoleDialog } from './useRoleDialog';

/** The marks that isolate a name inside a line, so it never reorders the words around it. */
const FSI = String.fromCodePoint(0x2068);
const PDI = String.fromCodePoint(0x2069);

const RIMA = { id: 5, name: 'Rima', role: 'USER' } as const;
const SARA = { id: 2, name: 'Sara', role: 'ADMIN' } as const;

/** The dialog for `person`, the server answering the change with `answer`. */
function renderDialog(
  person: { id: number; name: string; role: 'USER' | 'ADMIN' },
  answer: () => FakeAnswer = () => ({ status: 204 }),
) {
  const requests = fakeTransport(answer);
  const close = vi.fn();
  const rendered = renderHook(() => useRoleDialog(person, close), { wrapper: queryWrapper() });
  return { ...rendered, requests, close };
}

/** The toast whose title reads `text`, isolates and all, once it shows. */
const toastTitled = (title: string) =>
  findToast(
    (_content, element) =>
      element?.hasAttribute('data-title') === true && element.textContent === title,
  );

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useRoleDialog', () => {
  it('says what making a user an admin does, and what making an admin a user does', () => {
    const toAdmin = renderDialog(RIMA).result.current;

    expect(toAdmin.title).toBe(`Make ${FSI}Rima${PDI} an admin?`);
    expect(toAdmin.line).toBe(
      'They get every admin power over the platform and all its spaces, and their sessions end so they sign in again.',
    );
    expect(toAdmin.confirm.label).toBe('Make them an admin');
    expect(toAdmin.cancelLabel).toBe('Back');

    const toUser = renderDialog(SARA).result.current;

    expect(toUser.title).toBe(`Make ${FSI}Sara${PDI} a user again?`);
    expect(toUser.line).toBe('They lose the admin dashboard at once, and their sessions end.');
    expect(toUser.confirm.label).toBe('Make them a user');
  });

  it('sends the other role, waits for the admin’s views, then says so', async () => {
    render(<Toaster label="Notifications" />);
    const requests = fakeTransport(() => ({ status: 204 }));
    // An admin view on screen: its refetch after the change is held until the test lets it go.
    const refetch = deferred<string>();
    let reads = 0;
    const close = vi.fn();
    const { result } = renderHook(
      () => {
        useQuery({
          queryKey: ['admin', 'probe'],
          queryFn: () => (reads++ === 0 ? Promise.resolve('first') : refetch.promise),
        });
        return useRoleDialog(RIMA, close);
      },
      { wrapper: queryWrapper() },
    );
    await waitFor(() => {
      expect(reads).toBe(1);
    });

    let running: Promise<void> | undefined;
    act(() => {
      running = result.current.confirm.run();
    });

    await waitFor(() => {
      expect(reads).toBe(2);
    });
    expect(requests.map((request) => [request.method, request.url])).toEqual([
      ['put', '/admin/users/5/role'],
    ]);
    expect(bodyOf(requests[0])).toEqual({ role: 'ADMIN' });
    expect(result.current.confirm.busy).toBe(true);
    expect(screen.queryByText(/is now an admin/)).not.toBeInTheDocument();
    expect(close).not.toHaveBeenCalled();

    await act(async () => {
      refetch.resolve('second');
      await running;
    });

    expect(
      await toastTitled(`${FSI}Rima${PDI} is now an admin; their sessions ended`),
    ).toBeInTheDocument();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('sends the user role for an admin', async () => {
    const { result, requests } = renderDialog(SARA);

    await act(async () => {
      await result.current.confirm.run();
    });

    expect(bodyOf(requests[0])).toEqual({ role: 'USER' });
  });

  it.each([
    [
      'a link the list does not show',
      refused(409, { type: 'conflict', code: 'ACCOUNT_HAS_LINKS' }),
      'They hold a link the list doesn’t show — to a deleted space, or one made meanwhile; their role can’t change until it ends.',
    ],
    [
      'a temporary password not yet changed',
      refused(409, { type: 'conflict', code: 'ACCOUNT_PASSWORD_PENDING' }),
      'They haven’t changed their temporary password yet; they can’t be made an admin until they sign in and change it.',
    ],
    [
      'the last admin',
      refused(409, { type: 'conflict', code: 'LAST_ADMIN' }),
      'The platform must keep at least one active admin.',
    ],
    [
      'the admin’s own account',
      refused(409, { type: 'conflict', code: 'OWN_ACCOUNT' }),
      'You can’t do this to your own account.',
    ],
    ['an account gone', refused(404, { type: 'not_found' }), 'This account no longer exists.'],
  ])('words %s in the dialog, which stays open', async (_case, answer, message) => {
    const { result, close } = renderDialog(RIMA, () => answer);

    await act(async () => {
      await result.current.confirm.run();
    });

    expect(result.current.failure).toMatchObject({
      kind: 'refused',
      title: 'The role didn’t change',
      message,
    });
    expect(close).not.toHaveBeenCalled();
  });
});
