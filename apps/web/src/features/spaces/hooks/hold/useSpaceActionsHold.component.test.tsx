import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useSetSpaceHidden } from '../hide/useSetSpaceHidden';
import { useSpaceActionsHold } from './useSpaceActionsHold';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const tooMany = (seconds: number): FakeAnswer =>
  refused(429, { type: 'rate_limit' }, { 'retry-after': String(seconds) });

/**
 * Two rows' hide actions and, apart from them, the hold, as the page sets them, on one client; the
 * server answers each write with `write`.
 */
function renderHold(write: (request: Request) => FakeAnswer) {
  fakeTransport(write);
  render(<Toaster label="Notifications" />);
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rows = renderHook(() => ({ focus: useSetSpaceHidden(), palm: useSetSpaceHidden() }), {
    wrapper,
  });
  const hold = renderHook(() => useSpaceActionsHold(), { wrapper });
  return { rows, hold, client, wrapper };
}

/**
 * Sends an action and waits until its failure has reached the hooks: the mutation cache tells its
 * listeners on a later tick than the one the action settles on.
 */
async function fail(action: () => Promise<unknown>, heard: () => boolean) {
  await act(async () => {
    await action().catch(() => undefined);
  });
  await waitFor(() => {
    expect(heard()).toBe(true);
  });
}

const FOCUS = { spaceId: 7, name: { text: 'Focus Hub' }, isHidden: true };
const PALM = { spaceId: 9, name: { text: 'Palm Hub' }, isHidden: true };

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useSpaceActionsHold', () => {
  it('holds nothing while no action has been refused for too many requests', async () => {
    const { rows, hold } = renderHold(() => refused(404, { type: 'not_found' }));

    await fail(
      () => rows.result.current.focus.mutateAsync(FOCUS),
      () => rows.result.current.focus.isError,
    );

    expect(hold.result.current).toEqual({ view: null, blocked: false });
  });

  it('holds every row while a 429 counts down, and says how long', async () => {
    const { rows, hold } = renderHold(() => tooMany(30));

    await fail(
      () => rows.result.current.focus.mutateAsync(FOCUS),
      () => hold.result.current.blocked,
    );

    expect(hold.result.current).toEqual({
      view: { kind: 'rateLimit', message: 'Too many attempts. Try again in ⁦0:30⁩.' },
      blocked: true,
    });
  });

  it('keeps holding when another row fails after it for another reason', async () => {
    const { rows, hold } = renderHold((request) =>
      String(request.url).includes('/7/') ? tooMany(30) : refused(404, { type: 'not_found' }),
    );

    await fail(
      () => rows.result.current.focus.mutateAsync(FOCUS),
      () => hold.result.current.blocked,
    );
    await fail(
      () => rows.result.current.palm.mutateAsync(PALM),
      () => rows.result.current.palm.isError,
    );

    expect(hold.result.current.blocked).toBe(true);
  });

  it('holds until the longest wait ends, whichever row asked for it', async () => {
    const { rows, hold } = renderHold((request) =>
      String(request.url).includes('/7/') ? tooMany(30) : tooMany(5),
    );

    await fail(
      () => rows.result.current.focus.mutateAsync(FOCUS),
      () => hold.result.current.blocked,
    );
    await fail(
      () => rows.result.current.palm.mutateAsync(PALM),
      () => rows.result.current.palm.isError,
    );

    expect(hold.result.current.view).toEqual({
      kind: 'rateLimit',
      message: 'Too many attempts. Try again in ⁦0:30⁩.',
    });
  });

  it('keeps holding once the rows refused have gone, as after a change of filter or page', async () => {
    const { rows, hold } = renderHold(() => tooMany(30));
    await fail(
      () => rows.result.current.focus.mutateAsync(FOCUS),
      () => hold.result.current.blocked,
    );

    rows.unmount();
    // Long enough for a failure the cache no longer keeps to have left it.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(hold.result.current.blocked).toBe(true);
  });

  it('counts the time left on a page opened during the wait, not the whole wait', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T09:00:00Z'));
    const { rows, hold, wrapper } = renderHold(() => tooMany(30));
    await fail(
      () => rows.result.current.focus.mutateAsync(FOCUS),
      () => hold.result.current.blocked,
    );
    hold.unmount();

    vi.setSystemTime(new Date('2026-10-08T09:00:10Z'));
    const again = renderHook(() => useSpaceActionsHold(), { wrapper });

    expect(again.result.current).toEqual({
      view: { kind: 'rateLimit', message: 'Too many attempts. Try again in ⁦0:20⁩.' },
      blocked: true,
    });
  });

  it('lets the rows act again once the wait has ended, and holds nothing more', async () => {
    const { rows, hold, client } = renderHold(() => tooMany(1));

    await fail(
      () => rows.result.current.focus.mutateAsync(FOCUS),
      () => hold.result.current.blocked,
    );

    await waitFor(() => {
      expect(hold.result.current).toEqual({ view: null, blocked: false });
    });
    expect(client.getQueryData(['admin', 'spaces', 'hold'])).toBeNull();
  });
});
