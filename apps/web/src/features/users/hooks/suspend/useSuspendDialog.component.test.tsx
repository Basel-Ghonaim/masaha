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
import type { AccountPerson } from '../../types/AccountPerson';
import { useSuspendDialog } from './useSuspendDialog';

/** The marks that isolate a name inside a line, so it never reorders the words around it. */
const FSI = String.fromCodePoint(0x2068);
const PDI = String.fromCodePoint(0x2069);

const RIMA: AccountPerson = {
  id: 5,
  name: 'Rima',
  email: 'rima@example.com',
  isSuspended: false,
  hasPassword: true,
  ownsSpaces: false,
  atDesk: false,
};

const SESSIONS =
  'All their sessions end at once, and they can’t sign in until you restore the account.';
const SPACES = 'Their spaces stay verified; the Masaha team edits them only once they’re unlinked.';
const DESK = 'Their front-desk link is kept; they can’t work the desk until restored.';

/** The dialog for `person`, the server answering the suspension with `answer`. */
function renderDialog(person: AccountPerson, answer: () => FakeAnswer = () => ({ status: 204 })) {
  const requests = fakeTransport(answer);
  const close = vi.fn();
  const rendered = renderHook(() => useSuspendDialog(person, close), { wrapper: queryWrapper() });
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

describe('useSuspendDialog', () => {
  it('says the sessions end, and what stays for an owner’s spaces and a receptionist’s desk', () => {
    const plain = renderDialog(RIMA).result.current;
    expect(plain.title).toBe(`Suspend ${FSI}Rima${PDI}?`);
    expect(plain.lines).toEqual([SESSIONS]);
    expect(plain.confirm.label).toBe('Suspend');
    expect(plain.cancelLabel).toBe('Back');

    expect(renderDialog({ ...RIMA, ownsSpaces: true }).result.current.lines).toEqual([
      SESSIONS,
      SPACES,
    ]);
    expect(renderDialog({ ...RIMA, atDesk: true }).result.current.lines).toEqual([SESSIONS, DESK]);
  });

  it('suspends, waits for the admin’s views, then says so', async () => {
    render(<Toaster label="Notifications" />);
    const requests = fakeTransport(() => ({ status: 204 }));
    // An admin view on screen: its refetch after the suspension is held until the test lets it go.
    const refetch = deferred<string>();
    let reads = 0;
    const close = vi.fn();
    const { result } = renderHook(
      () => {
        useQuery({
          queryKey: ['admin', 'probe'],
          queryFn: () => (reads++ === 0 ? Promise.resolve('first') : refetch.promise),
        });
        return useSuspendDialog(RIMA, close);
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
      ['put', '/admin/users/5/suspended'],
    ]);
    expect(bodyOf(requests[0])).toEqual({ isSuspended: true });
    expect(result.current.confirm.busy).toBe(true);
    expect(screen.queryByText(/suspended; their sessions ended/)).not.toBeInTheDocument();
    expect(close).not.toHaveBeenCalled();

    await act(async () => {
      refetch.resolve('second');
      await running;
    });

    expect(
      await toastTitled(`${FSI}Rima${PDI} suspended; their sessions ended`),
    ).toBeInTheDocument();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'the admin’s own account',
      refused(409, { type: 'conflict', code: 'OWN_ACCOUNT' }),
      'You can’t do this to your own account.',
    ],
    [
      'the last admin',
      refused(409, { type: 'conflict', code: 'LAST_ADMIN' }),
      'The platform must keep at least one active admin.',
    ],
    ['an account gone', refused(404, { type: 'not_found' }), 'This account no longer exists.'],
  ])('words %s in the dialog, which stays open', async (_case, answer, message) => {
    const { result, close } = renderDialog(RIMA, () => answer);

    await act(async () => {
      await result.current.confirm.run();
    });

    expect(result.current.failure).toMatchObject({
      kind: 'refused',
      title: 'The account wasn’t suspended',
      message,
    });
    expect(close).not.toHaveBeenCalled();
  });
});
