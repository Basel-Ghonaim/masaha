import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { sentPosition } from '../../../../test/fakeRecovery';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { useRecoveryPositionQuery } from '../useRecoveryPositionQuery';
import { useResendLink } from './useResendLink';

/**
 * The resend beside the recovery's read: the reads answer `positions` in turn (the last one again
 * after that), and the resend answers `resent`.
 */
function renderResend(positions: FakeAnswer[], resent: FakeAnswer) {
  let reads = 0;
  const requests = fakeTransport((config) => {
    if (config.method !== 'get') return resent;
    reads += 1;
    return positions[Math.min(reads, positions.length) - 1] ?? ok({ step: 'request' });
  });
  const rendered = renderHook(
    () => ({ resend: useResendLink(), position: useRecoveryPositionQuery() }),
    { wrapper: queryWrapper() },
  );
  return { ...rendered, reads: () => requests.filter((request) => request.method === 'get') };
}

afterEach(() => {
  restoreTransport();
});

describe('useResendLink', () => {
  it('holds the position the server answered, with its new window', async () => {
    const { result, reads } = renderResend(
      [ok(sentPosition({ resendInSeconds: 0 }))],
      ok(sentPosition({ resendInSeconds: 60 }), 202),
    );
    await waitFor(() => {
      expect(result.current.position.data).toEqual(sentPosition({ resendInSeconds: 0 }));
    });

    await act(() => result.current.resend.mutateAsync());

    await waitFor(() => {
      expect(result.current.position.data).toEqual(sentPosition({ resendInSeconds: 60 }));
    });
    expect(reads()).toHaveLength(1);
  });

  it.each([
    ['RECOVERY_INVALID', { step: 'request' }],
    ['RESEND_LIMIT_REACHED', sentPosition({ canResend: false })],
  ] as const)(
    'reads the position again when refused with %s, to show where the recovery now stands',
    async (code, now) => {
      const { result } = renderResend(
        [ok(sentPosition({ resendInSeconds: 0 })), ok(now)],
        refused(400, { type: 'bad_request', code }),
      );
      await waitFor(() => {
        expect(result.current.position.data).toEqual(sentPosition({ resendInSeconds: 0 }));
      });

      await act(async () => {
        await result.current.resend.mutateAsync().catch(() => undefined);
      });

      await waitFor(() => {
        expect(result.current.position.data).toEqual(now);
      });
    },
  );

  it('keeps the position when the resend is refused for too many attempts', async () => {
    const { result, reads } = renderResend(
      [ok(sentPosition({ resendInSeconds: 0 }))],
      refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }),
    );
    await waitFor(() => {
      expect(result.current.position.data).toBeDefined();
    });

    await act(async () => {
      await result.current.resend.mutateAsync().catch(() => undefined);
    });

    expect(result.current.position.data).toEqual(sentPosition({ resendInSeconds: 0 }));
    expect(reads()).toHaveLength(1);
  });
});
