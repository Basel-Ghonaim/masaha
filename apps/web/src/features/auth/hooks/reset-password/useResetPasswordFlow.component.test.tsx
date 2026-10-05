import type { RecoveryPosition } from '@masaha/shared/auth';
import { createQueryClient, type QueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { MASKED_EMAIL } from '../../../../test/fakeRecovery';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useResetPasswordFlow } from './useResetPasswordFlow';

/** A request, as the fake server receives it. */
type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const PASSWORD: RecoveryPosition = { step: 'password', email: MASKED_EMAIL };

/** Opens the page at `address`, in the browser and in the router, as a link from the email does. */
function renderFlow(
  address: string,
  answer: (config: Request, index: number) => FakeAnswer | Promise<FakeAnswer>,
  { strict = false } = {},
) {
  window.history.replaceState(null, '', address);
  const requests = fakeTransport(answer);
  const client: QueryClient = createQueryClient();
  const container = document.body.appendChild(document.createElement('div'));
  const rendered = renderHook(
    () => ({ page: useResetPasswordFlow(), location: useLocation(), navigate: useNavigate() }),
    {
      container,
      reactStrictMode: strict,
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={[address]}>{children}</MemoryRouter>
        </QueryClientProvider>
      ),
    },
  );
  return { ...rendered, requests, client, container };
}

/**
 * Whether `text` is anywhere in the state the hook under test holds: every value its hooks keep,
 * searched through React's own record of the rendered component, own properties included, so an
 * error's `cause` is searched too.
 */
function holdsText(container: HTMLElement, text: string): boolean {
  type Fiber = {
    type: unknown;
    memoizedState: unknown;
    child: Fiber | null;
    sibling: Fiber | null;
  };
  const key = Object.keys(container).find((name) => name.startsWith('__reactContainer$'));
  const seen = new WeakSet<object>();
  const search = (value: unknown): boolean => {
    if (typeof value === 'string') return value.includes(text);
    if (typeof value !== 'object' || value === null || value instanceof Node) return false;
    if (seen.has(value)) return false;
    seen.add(value);
    return Object.getOwnPropertyNames(value).some((name) =>
      search((value as Record<string, unknown>)[name]),
    );
  };
  const fibers: Fiber[] =
    key === undefined ? [] : [(container as unknown as Record<string, Fiber>)[key] as Fiber];
  for (let fiber = fibers.pop(); fiber !== undefined; fiber = fibers.pop()) {
    // renderHook renders the hook inside its own `TestComponent`.
    if (typeof fiber.type === 'function' && fiber.type.name === 'TestComponent') {
      if (search(fiber.memoizedState)) return true;
    }
    if (fiber.child) fibers.push(fiber.child);
    if (fiber.sibling) fibers.push(fiber.sibling);
  }
  return false;
}

/** Answers the check with `check`, and every read of the position with `position`. */
function answering(check: () => FakeAnswer, position: RecoveryPosition = { step: 'request' }) {
  return (config: Request) =>
    config.url === '/auth/password/reset/check' ? check() : ok(position);
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  window.history.replaceState(null, '', '/');
});

describe('useResetPasswordFlow', () => {
  it('takes the token out of the address bar before any request is sent', async () => {
    const seenAtRequest: string[] = [];
    const { requests } = renderFlow('/reset-password#token=link-token', () => {
      seenAtRequest.push(window.location.href);
      return ok(PASSWORD);
    });

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(seenAtRequest).toEqual([`${window.location.origin}/reset-password`]);
    expect(requests[0]).toMatchObject({ method: 'post', url: '/auth/password/reset/check' });
    expect(bodyOf(requests[0])).toEqual({ token: 'link-token' });
  });

  it('takes the link out of the router’s address too', async () => {
    const { result } = renderFlow('/reset-password#token=link-token', () => ok(PASSWORD));

    await waitFor(() => {
      expect(result.current.page.kind).toBe('form');
    });
    expect(result.current.location.hash).toBe('');
    expect(result.current.location.pathname).toBe('/reset-password');
  });

  it('checks the link once, even when React runs its effects twice', async () => {
    const { result, requests } = renderFlow(
      '/reset-password#token=link-token',
      () => ok(PASSWORD),
      {
        strict: true,
      },
    );

    await waitFor(() => {
      expect(result.current.page.kind).toBe('form');
    });
    expect(requests).toHaveLength(1);
  });

  it('shows the form for the account the check named, reading no position meanwhile', async () => {
    const { result, requests } = renderFlow('/reset-password#token=link-token', () => ok(PASSWORD));

    expect(result.current.page.kind).toBe('loading');
    await waitFor(() => {
      expect(result.current.page.kind).toBe('form');
    });
    const page = result.current.page;
    if (page.kind !== 'form') throw new Error('Not at the form');
    expect(page.forAccount.replace(/[\u2066-\u2069]/g, '')).toBe(`For ${MASKED_EMAIL}`);
    expect(requests.map((request) => request.method)).toEqual(['post']);
  });

  it('keeps no copy of the token once the check is answered', async () => {
    const { result, client } = renderFlow('/reset-password#token=link-token', () => ok(PASSWORD));

    await waitFor(() => {
      expect(result.current.page.kind).toBe('form');
    });

    await waitFor(() => {
      expect(client.getMutationCache().getAll()).toEqual([]);
    });
  });

  it.each([
    ['too many attempts', refused(429, { type: 'rate_limit' }, { 'retry-after': '60' })],
    ['a server error', refused(500, { type: 'server' })],
  ])(
    'keeps nothing of the token once the check is refused for %s, in what it returns or its state',
    async (_, answer) => {
      const { result, client, container } = renderFlow(
        '/reset-password#token=link-token',
        answering(() => answer),
      );

      await waitFor(() => {
        expect(result.current.page.kind).toBe('checkFailed');
      });
      await waitFor(() => {
        expect(client.getMutationCache().getAll()).toEqual([]);
      });
      expect(JSON.stringify(result.current.page)).not.toContain('link-token');
      expect(holdsText(container, 'link-token')).toBe(false);
    },
  );

  it('sends the same token again when the check got no answer and the reader retries', async () => {
    const { result, requests } = renderFlow('/reset-password#token=link-token', (_, index) =>
      index === 0 ? { failure: 'ERR_NETWORK' } : ok(PASSWORD),
    );
    await waitFor(() => {
      expect(result.current.page).toMatchObject({ kind: 'unreachable', reason: 'offline' });
    });

    act(() => {
      const page = result.current.page;
      if (page.kind === 'unreachable') page.retry();
    });

    await waitFor(() => {
      expect(result.current.page.kind).toBe('form');
    });
    expect(requests.map((request) => bodyOf(request))).toEqual([
      { token: 'link-token' },
      { token: 'link-token' },
    ]);
  });

  it('shows why the check failed when it was answered with no verdict on the link', async () => {
    const { result } = renderFlow(
      '/reset-password#token=link-token',
      answering(() => refused(429, { type: 'rate_limit' }, { 'retry-after': '60' })),
    );

    await waitFor(() => {
      expect(result.current.page).toMatchObject({
        kind: 'checkFailed',
        failure: { kind: 'rateLimit' },
      });
    });
    const page = result.current.page;
    if (page.kind !== 'checkFailed' || page.failure === null) throw new Error('No failure shown');
    expect(page.failure.message.replace(/[\u2066-\u2069]/g, '')).toMatch(
      /^Too many attempts\. Try again in (1:00|0:59)\.$/,
    );
  });

  it('shows the reason, with its reference, when the check was answered with a server error', async () => {
    const { result } = renderFlow(
      '/reset-password#token=link-token',
      answering(() => refused(500, { type: 'server' })),
    );

    await waitFor(() => {
      expect(result.current.page).toMatchObject({
        kind: 'checkFailed',
        failure: { kind: 'refused', title: 'Couldn’t check the link' },
      });
    });
  });

  it('takes a link opened on the page already showing out of the address before checking it', async () => {
    const seenAtCheck: string[] = [];
    const { result, requests } = renderFlow('/reset-password', (config) => {
      if (config.url === '/auth/password/reset/check') seenAtCheck.push(window.location.href);
      return ok(PASSWORD);
    });
    await waitFor(() => {
      expect(result.current.page.kind).toBe('form');
    });

    // A new link pasted into the same tab changes only the fragment.
    window.history.replaceState(null, '', '/reset-password#token=second-link');
    act(() => {
      void result.current.navigate('/reset-password#token=second-link');
    });

    await waitFor(() => {
      expect(seenAtCheck).toHaveLength(1);
    });
    expect(seenAtCheck).toEqual([`${window.location.origin}/reset-password`]);
    const check = requests.find((request) => request.url === '/auth/password/reset/check');
    expect(bodyOf(check)).toEqual({ token: 'second-link' });
    await waitFor(() => {
      expect(result.current.page.kind).toBe('form');
    });
    expect(result.current.location.hash).toBe('');
  });

  it('shows the step the server holds when the address carries no link, as after a reload', async () => {
    const { result, requests } = renderFlow('/reset-password', () => ok(PASSWORD));

    await waitFor(() => {
      expect(result.current.page.kind).toBe('form');
    });
    expect(requests.map((request) => request.method)).toEqual(['get']);
  });

  it('says no link can be used when none is open in this browser', async () => {
    const { result } = renderFlow('/reset-password', () => ok({ step: 'request' }));

    await waitFor(() => {
      expect(result.current.page.kind).toBe('invalid');
    });
  });

  it('keeps saying the password was set once the session’s end clears the server state', async () => {
    const { result, client } = renderFlow('/reset-password', () => ok(PASSWORD));
    await waitFor(() => {
      expect(result.current.page.kind).toBe('form');
    });

    act(() => {
      const page = result.current.page;
      if (page.kind === 'form') page.saved();
    });
    act(() => {
      client.clear();
    });

    expect(result.current.page.kind).toBe('done');
  });
});
