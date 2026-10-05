import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { MASKED_EMAIL, sentPosition } from '../../../../test/fakeRecovery';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useForgotPasswordFlow } from './useForgotPasswordFlow';
import { useRequestLink } from './useRequestLink';

/** A text with the Unicode isolates around its inserted values removed, as a reader sees it. */
function seen(text: string) {
  return text.replace(/[\u2066-\u2069]/g, '');
}

/** The page's hook, with the request for a link beside it, the reads answered by `read` in turn. */
function renderForgot(read: (index: number) => FakeAnswer) {
  let reads = 0;
  const requests = fakeTransport((config) =>
    config.method === 'get' ? read(reads++) : ok(sentPosition(), 202),
  );
  const rendered = renderHook(
    () => ({ page: useForgotPasswordFlow(), request: useRequestLink() }),
    {
      wrapper: queryWrapper(),
    },
  );
  return { ...rendered, requests };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useForgotPasswordFlow', () => {
  it('shows the step the server holds on load, with the masked email ready to read', async () => {
    const { result } = renderForgot(() => ok(sentPosition({ canResend: false })));

    expect(result.current.page.kind).toBe('loading');
    await waitFor(() => {
      expect(result.current.page.kind).toBe('sent');
    });
    const page = result.current.page;
    if (page.kind !== 'sent') throw new Error('Not at sent');
    expect(seen(page.sentTo)).toBe(`Sent to ${MASKED_EMAIL}`);
    expect(page.canResend).toBe(false);
  });

  it('offers a retry when the read fails, and the retry reads the position again', async () => {
    // A refusal that is no position, such as a cross-site request's, is not retried by the transport.
    const { result } = renderForgot((index) =>
      index === 0 ? refused(403, { type: 'forbidden' }) : ok(sentPosition()),
    );

    await waitFor(() => {
      expect(result.current.page).toMatchObject({ kind: 'unreachable', reason: 'error' });
    });
    act(() => {
      const page = result.current.page;
      if (page.kind === 'unreachable') page.retry();
    });

    await waitFor(() => {
      expect(result.current.page.kind).toBe('sent');
    });
  });

  it('shows the email form once the reader chooses to enter it again, until a new link is asked for', async () => {
    const { result } = renderForgot(() => ok(sentPosition({ canResend: false })));
    await waitFor(() => {
      expect(result.current.page.kind).toBe('sent');
    });

    act(() => {
      const page = result.current.page;
      if (page.kind === 'sent') page.enterEmailAgain();
    });
    await waitFor(() => {
      expect(result.current.page.kind).toBe('request');
    });

    await act(() => result.current.request.mutateAsync({ email: 'sara@example.com' }));

    await waitFor(() => {
      expect(result.current.page).toMatchObject({ kind: 'sent', canResend: true });
    });
  });

  it('describes an open link with the account’s masked email', async () => {
    const { result } = renderForgot(() => ok({ step: 'password', email: MASKED_EMAIL }));

    await waitFor(() => {
      expect(result.current.page.kind).toBe('linkOpen');
    });
    const page = result.current.page;
    if (page.kind !== 'linkOpen') throw new Error('Not at linkOpen');
    expect(seen(page.description)).toBe(
      `For ${MASKED_EMAIL}. Set your new password, or ask for a new link.`,
    );
  });
});
