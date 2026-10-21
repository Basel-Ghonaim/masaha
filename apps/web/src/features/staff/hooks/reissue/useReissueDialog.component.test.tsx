import type { StaffMember } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { staffKeys } from '../queryKeys';
import { useReissueDialog } from './useReissueDialog';

const RAHAF: StaffMember = {
  userId: 15,
  name: 'Rahaf',
  email: 'rahaf@example.com',
  isActive: true,
  temporaryPassword: { expiresAt: '2999-01-01T00:00:00Z' },
};

/** Rahaf's re-issue at space 7, the list in the cache, the server answering with `answer`. */
function renderDialog(answer: () => FakeAnswer) {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  client.setQueryData(staffKeys.list(7), [RAHAF]);
  const issued = vi.fn<(password: string) => void>();
  const close = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(() => useReissueDialog(7, RAHAF, { issued, close }), { wrapper });
  return { ...rendered, requests, client, issued, close };
}

async function confirm(result: { current: ReturnType<typeof useReissueDialog> }) {
  await act(async () => {
    await result.current.confirm.run();
  });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useReissueDialog', () => {
  it('says the previous password ends, and the sessions with it', () => {
    const { result } = renderDialog(() => ok({ temporaryPassword: 'x' }));

    expect(result.current.title.replace(/[\u2066-\u2069]/g, '')).toBe(
      'A new temporary password for Rahaf?',
    );
    expect(result.current.description).toBe(
      'It replaces the previous temporary password and ends their sessions; they’ll be asked to change it at their first sign-in.',
    );
  });

  it('hands the new password to the page, keeping none in the cache', async () => {
    const { result, requests, client, issued, close } = renderDialog(() =>
      ok({ temporaryPassword: 'Tmp-9001-ab' }),
    );

    await confirm(result);

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toContain(
      'post /manage/spaces/7/staff/15/temporary-password',
    );
    expect(close).toHaveBeenCalledTimes(1);
    expect(issued).toHaveBeenCalledExactlyOnceWith('Tmp-9001-ab');
    // The answer is held by the page alone: no mutation keeps it once it is collected.
    await waitFor(() => {
      expect(
        JSON.stringify(
          client
            .getMutationCache()
            .getAll()
            .map(({ state }) => state),
        ),
      ).not.toContain('Tmp-9001-ab');
    });
  });

  it.each([
    [
      refused(409, { type: 'conflict', code: 'TEMPORARY_PASSWORD_NOT_PENDING' }),
      'They’ve already changed the temporary password; no new one is needed.',
      true,
    ],
    [
      refused(409, { type: 'conflict', code: 'ACCOUNT_HAS_LINKS' }),
      'This account now has another space; they recover their password from the Masaha team.',
      false,
    ],
    [
      refused(409, { type: 'conflict', code: 'ACCOUNT_SUSPENDED' }),
      'Their account is suspended by the Masaha team; their access comes back once it’s restored.',
      false,
    ],
    [
      refused(404, { type: 'not_found' }),
      'This person is no longer on the space’s staff, or the space is no longer open to you.',
      true,
    ],
  ])(
    'words a refusal inside (%#), and reads the list again when it changed',
    async (answer, line, again) => {
      const { result, client, issued, close } = renderDialog(() => answer);

      await confirm(result);

      await waitFor(() => {
        expect(result.current.failure).toMatchObject({ kind: 'refused', message: line });
      });
      expect(client.getQueryState(staffKeys.list(7))?.isInvalidated).toBe(again);
      expect(close).not.toHaveBeenCalled();
      expect(issued).not.toHaveBeenCalled();
    },
  );
});
