import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import type { AccountPerson } from '../../types/AccountPerson';
import { useIssuePasswordDialog } from './useIssuePasswordDialog';

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

/** The confirm for Rima; the server answers the issue with `answer`, in a client the test reads. */
function renderDialog(
  answer: () => FakeAnswer = () => ok({ temporaryPassword: 'Tmp-4821-xk' }, 201),
) {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  const close = vi.fn();
  const rendered = renderHook(() => useIssuePasswordDialog(RIMA, close), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { ...rendered, requests, close, client };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useIssuePasswordDialog', () => {
  it('says what issuing does before it is done', () => {
    const { result, requests } = renderDialog();

    expect(result.current.title).toBe(`Issue a temporary password for ${FSI}Rima${PDI}?`);
    expect(result.current.line).toBe(
      'To recover the account once you’ve confirmed who they are. Their current password stops working and their sessions end; they must change it at the next sign-in.',
    );
    expect(result.current.confirm.label).toBe('Issue');
    expect(result.current.cancelLabel).toBe('Back');
    expect(result.current.issued).toBeNull();
    expect(requests).toEqual([]);
  });

  it('issues, hands the password on once, and keeps none in the cache', async () => {
    const { result, requests, close, client } = renderDialog();

    await act(async () => {
      await result.current.confirm.run();
    });

    expect(requests.map((request) => [request.method, request.url])).toEqual([
      ['post', '/admin/users/5/temporary-password'],
    ]);
    expect(result.current.issued).toBe('Tmp-4821-xk');
    expect(close).not.toHaveBeenCalled();
    // The answer is held by the dialog alone: no mutation keeps it once it is collected.
    await waitFor(() => {
      expect(
        client
          .getMutationCache()
          .getAll()
          .map((mutation) => mutation.state.data),
      ).not.toContainEqual({ temporaryPassword: 'Tmp-4821-xk' });
    });

    act(() => {
      result.current.done();
    });

    expect(result.current.issued).toBeNull();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'the admin’s own account',
      refused(409, { type: 'conflict', code: 'OWN_ACCOUNT' }),
      'You can’t do this to your own account.',
    ],
    [
      'a suspended account',
      refused(409, { type: 'conflict', code: 'ACCOUNT_SUSPENDED' }),
      'The account is suspended — restore it first.',
    ],
    [
      'a Google-only account',
      refused(409, { type: 'conflict', code: 'GOOGLE_ONLY_ACCOUNT' }),
      'This account signs in with Google only, so it has no password to replace.',
    ],
    ['an account gone', refused(404, { type: 'not_found' }), 'This account no longer exists.'],
  ])('words %s in the confirm, which stays open', async (_case, answer, message) => {
    const { result, close } = renderDialog(() => answer);

    await act(async () => {
      await result.current.confirm.run();
    });

    expect(result.current.failure).toMatchObject({
      kind: 'refused',
      title: 'No password was issued',
      message,
    });
    expect(result.current.issued).toBeNull();
    expect(close).not.toHaveBeenCalled();
  });
});
