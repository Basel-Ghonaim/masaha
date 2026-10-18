import type { AdminUserRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import type { SpaceChoiceView } from '../../types/SpaceChoiceView';
import { useAddOwnerForm } from './useAddOwnerForm';

/** A request the fake server received. */
type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

type Form = ReturnType<typeof useAddOwnerForm>;

const FOCUS_HUB: SpaceChoiceView = {
  value: '7',
  id: 7,
  name: { text: 'Focus Hub' },
  badges: [],
  owners: 'No owner',
  isVerified: false,
};

const RIMA: AdminUserRow = {
  id: 5,
  name: 'Rima Haddad',
  email: 'rima@example.com',
  role: 'USER',
  isSuspended: false,
  signIn: { password: true, google: false },
  joinedAt: '2026-09-01T08:00:00Z',
  spaces: [],
  receptionSpaces: [],
};

/** A page of `rows`, the only one. */
function page(rows: unknown[]): FakeAnswer {
  const meta = {
    currentPage: 1,
    limit: 20,
    totalPages: rows.length > 0 ? 1 : 0,
    totalRecords: rows.length,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  return { status: 200, data: { success: true, data: rows, meta } };
}

/** The hook as the sheet uses it, adding an owner answered by `add`; the users list finds Rima. */
function renderForm(add: (request: Request) => FakeAnswer) {
  const requests = fakeTransport((request) => {
    if (request.url === '/admin/users') return page([RIMA]);
    if (request.url === '/admin/spaces') return page([]);
    return add(request);
  });
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(() => useAddOwnerForm(), { wrapper });
  const adds = () => requests.filter((request) => request.url === '/admin/owners').map(bodyOf);
  return { ...rendered, client, adds };
}

/** Types `value` into a field through its bindings. */
async function type(form: () => Form, name: 'name' | 'email', value: string) {
  await act(async () => {
    await form().fields[name].onChange({ target: { name, value } });
  });
}

/** Fills the sheet — a name, `email`, and Focus Hub unless `space` is false — and sends it. */
async function send(form: () => Form, email = 'rima@example.com', space = true) {
  await type(form, 'name', 'Rima Haddad');
  await type(form, 'email', email);
  if (space) {
    act(() => {
      form().chooseSpace(FOCUS_HUB);
    });
  }
  act(() => {
    form().submit.run();
  });
}

const NEW_OWNER = () => ok({ userId: 12, temporaryPassword: 'Tmp-4821-xk' }, 201);

/** The email has an account: the server asks for the upgrade until it is asked for. */
function hasAccount(request: Request): FakeAnswer {
  return (bodyOf(request) as { upgradeExisting?: boolean }).upgradeExisting === true
    ? ok({ userId: 5, temporaryPassword: null }, 201)
    : refused(409, { type: 'conflict', code: 'EMAIL_HAS_ACCOUNT' });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useAddOwnerForm', () => {
  it('sends a new owner without asking to upgrade, and hands on the password once', async () => {
    const { result, adds } = renderForm(NEW_OWNER);

    await send(() => result.current, 'new@example.com');

    await waitFor(() => {
      expect(result.current.added).not.toBeNull();
    });
    expect(adds()).toEqual([{ name: 'Rima Haddad', email: 'new@example.com', spaceId: 7 }]);
    expect(result.current.added).toEqual({
      userId: 12,
      name: 'Rima Haddad',
      email: 'new@example.com',
      temporaryPassword: 'Tmp-4821-xk',
    });

    act(() => {
      result.current.done();
    });
    expect(result.current.added).toBeNull();
  });

  it('turns to upgrading when the email has an account, and sends the upgrade', async () => {
    const { result, adds } = renderForm(hasAccount);

    await send(() => result.current);

    await waitFor(() => {
      expect(result.current.notice.kind).toBe('upgrade');
    });
    expect(result.current.failure).toBeNull();
    expect(result.current.submit.label).toBe('Upgrade and link');

    act(() => {
      result.current.submit.run();
    });

    await waitFor(() => {
      expect(adds()).toHaveLength(2);
    });
    expect(adds()).toEqual([
      { name: 'Rima Haddad', email: 'rima@example.com', spaceId: 7 },
      { name: 'Rima Haddad', email: 'rima@example.com', spaceId: 7, upgradeExisting: true },
    ]);
    expect(result.current.added).toBeNull();
  });

  it('goes back to creating once the email changes, sending no upgrade for the new one', async () => {
    const { result, adds } = renderForm(hasAccount);

    await send(() => result.current);
    await waitFor(() => {
      expect(result.current.notice.kind).toBe('upgrade');
    });

    await type(() => result.current, 'email', 'other@example.com');

    expect(result.current.notice.kind).toBe('create');
    expect(result.current.submit.label).toBe('Create account and link');

    act(() => {
      result.current.submit.run();
    });

    await waitFor(() => {
      expect(adds()).toHaveLength(2);
    });
    expect(adds()[1]).toEqual({ name: 'Rima Haddad', email: 'other@example.com', spaceId: 7 });
  });

  it.each([
    [
      'ACCOUNT_IS_ADMIN',
      'This email is an admin’s account, and an admin can’t be linked to a space.',
    ],
    ['ACCOUNT_SUSPENDED', 'This account is suspended; it can’t be linked until it’s restored.'],
    [
      'ALREADY_OWNER',
      'This email is already an owner’s — link them to the space from their row in the list.',
    ],
  ])('words %s on the form', async (code, message) => {
    const { result } = renderForm(() => refused(409, { type: 'conflict', code }));

    await send(() => result.current);

    await waitFor(() => {
      expect(result.current.failure).toMatchObject({
        kind: 'refused',
        title: 'The owner wasn’t added',
        message,
      });
    });
  });

  it('asks for the space before anything is sent', async () => {
    const { result, adds } = renderForm(NEW_OWNER);

    await send(() => result.current, 'new@example.com', false);

    await waitFor(() => {
      expect(result.current.errors.spaceId).toBe('Choose the space');
    });
    expect(adds()).toEqual([]);
  });

  it('keeps no temporary password in the cache once it is handed on', async () => {
    const { result, client } = renderForm(NEW_OWNER);

    await send(() => result.current, 'new@example.com');
    await waitFor(() => {
      expect(result.current.added).not.toBeNull();
    });

    await waitFor(() => {
      expect(
        JSON.stringify(
          client
            .getMutationCache()
            .getAll()
            .map((m) => m.state),
        ),
      ).not.toContain('Tmp-4821-xk');
    });
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((q) => q.state),
      ),
    ).not.toContain('Tmp-4821-xk');
  });
});
