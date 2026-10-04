import { AppError } from '@shared/errors';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../test/startPreferences';
import { useFormFailure } from './useFormFailure';

type Fields = Partial<ConstructorParameters<typeof AppError>[0]>;

function failure(fields: Fields) {
  return new AppError({ type: 'server', status: 500, message: 'Fake', ...fields });
}

/** The hook for one failure held across renders, as a form holds it. */
function renderFailure(held: AppError | null, retry = vi.fn()) {
  return renderHook(() => useFormFailure(held, { title: 'Couldn’t sign in', retry }));
}

/** A text with the Unicode isolates around its inserted values removed, as a reader sees it. */
function seen(text: string | undefined) {
  return text?.replace(/[\u2066-\u2069]/g, '');
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useFormFailure', () => {
  it('shows nothing, and blocks nothing, without a failure', () => {
    const { result } = renderFailure(null);

    expect(result.current).toEqual({ view: null, blocked: false });
  });

  it('counts down too many attempts, blocking the submit, and is gone when the count ends', () => {
    vi.useFakeTimers();
    const { result } = renderFailure(
      failure({ type: 'rate_limit', status: 429, retryAfterSeconds: 61 }),
    );
    expect(result.current.blocked).toBe(true);
    expect(result.current.view?.kind).toBe('rateLimit');
    expect(seen(result.current.view?.message)).toBe('Too many attempts. Try again in 1:01.');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(seen(result.current.view?.message)).toBe('Too many attempts. Try again in 0:59.');

    act(() => {
      vi.advanceTimersByTime(59_000);
    });
    expect(result.current).toEqual({ view: null, blocked: false });
  });

  it('says to wait a moment for too many attempts without a Retry-After, blocking nothing', () => {
    const { result } = renderFailure(failure({ type: 'rate_limit', status: 429 }));

    expect(result.current).toEqual({
      view: {
        kind: 'rateLimit',
        message: 'Too many attempts. Please wait a moment and try again.',
      },
      blocked: false,
    });
  });

  it('offers to try again when there is no connection, and the offer sends the form again', () => {
    const retry = vi.fn();
    const { result } = renderFailure(failure({ type: 'network', status: 0 }), retry);

    expect(result.current.view).toMatchObject({
      kind: 'offline',
      title: 'Couldn’t connect',
      message: 'Check your internet connection and try again.',
      retryLabel: 'Try again',
    });
    if (result.current.view?.kind !== 'offline') throw new Error('expected the offline view');
    result.current.view.retry();
    expect(retry).toHaveBeenCalledOnce();
  });

  it('offers to try again, with its own line, when no answer came in time', () => {
    const { result } = renderFailure(failure({ type: 'timeout', status: 0 }));

    expect(result.current.view).toMatchObject({
      kind: 'offline',
      message: 'The server took too long to respond. Please try again.',
    });
  });

  it("shows a general error under the form's title, with the request's reference", () => {
    const { result } = renderFailure(failure({ requestId: 'req-7' }));

    expect(result.current.view).toMatchObject({
      kind: 'refused',
      title: 'Couldn’t sign in',
      message: 'Something went wrong on our side. Please try again.',
    });
    if (result.current.view?.kind !== 'refused') throw new Error('expected the refused view');
    expect(seen(result.current.view.reference)).toBe('Reference: req-7');
  });

  it("shows a domain code's line, with no reference", () => {
    const { result } = renderFailure(
      failure({ type: 'unauthorized', status: 401, code: 'INVALID_CREDENTIALS', requestId: 'r' }),
    );

    expect(result.current.view).toEqual({
      kind: 'refused',
      title: 'Couldn’t sign in',
      message: 'The email or password is incorrect.',
    });
  });
});
