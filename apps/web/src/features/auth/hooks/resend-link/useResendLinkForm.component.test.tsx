import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { sentPosition } from '../../../../test/fakeRecovery';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useResendLinkForm } from './useResendLinkForm';

/** A text with the Unicode isolates around its inserted values removed, as a reader sees it. */
function seen(text: string) {
  return text.replace(/[\u2066-\u2069]/g, '');
}

/** The resend's form at a recovery whose window is `seconds`, the resend answered by `resent`. */
function renderResend(seconds: number, resent: FakeAnswer = ok(sentPosition(), 202)) {
  const requests = fakeTransport((config) =>
    config.method === 'get' ? ok(sentPosition({ resendInSeconds: seconds })) : resent,
  );
  const rendered = renderHook(() => useResendLinkForm(), { wrapper: queryWrapper() });
  return { ...rendered, requests };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useResendLinkForm', () => {
  it('waits out the server’s window, counted as a clock on the label', async () => {
    const { result } = renderResend(65);

    await waitFor(() => {
      expect(seen(result.current.label)).toBe('Resend in 1:05');
    });
    expect(result.current.disabled).toBe(true);
  });

  it('offers the resend once the window has ended', async () => {
    const { result } = renderResend(1);

    await waitFor(
      () => {
        expect(result.current.label).toBe('Resend');
      },
      { timeout: 2500 },
    );
    expect(result.current.disabled).toBe(false);
  });

  it('sends the resend with no body', async () => {
    const { result, requests } = renderResend(0);
    await waitFor(() => {
      expect(result.current.label).toBe('Resend');
    });

    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(requests.map((request) => request.method)).toEqual(['get', 'post']);
    });
    expect(requests[1]?.data).toBeUndefined();
  });

  it('holds the submit while too many attempts are counted down', async () => {
    const { result } = renderResend(
      0,
      refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }),
    );
    await waitFor(() => {
      expect(result.current.label).toBe('Resend');
    });

    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.failure).toMatchObject({ kind: 'rateLimit' });
    });
    expect(result.current.disabled).toBe(true);
  });
});
