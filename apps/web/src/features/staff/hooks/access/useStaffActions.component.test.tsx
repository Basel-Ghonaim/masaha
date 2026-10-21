import type { StaffMember } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { startPreferences } from '../../../../test/startPreferences';
import type { StaffDialog } from '../../types/StaffDialog';
import { staffKeys } from '../queryKeys';
import { useStaffActions, type StaffActionItem } from './useStaffActions';

const RAHAF: StaffMember = {
  userId: 15,
  name: 'Rahaf',
  email: 'rahaf@example.com',
  isActive: true,
  temporaryPassword: null,
};
const PENDING: StaffMember = { ...RAHAF, temporaryPassword: { expiresAt: '2999-01-01T00:00:00Z' } };
const INACTIVE: StaffMember = { ...PENDING, isActive: false };

/** Rahaf's menu at space 7, as `member`, the list in the cache, every write answered by `answer`. */
function renderActions(
  member: StaffMember,
  answer: () => FakeAnswer | Promise<FakeAnswer> = () => ok(member),
) {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  client.setQueryData(staffKeys.list(7), [member]);
  const open = vi.fn<(dialog: StaffDialog) => void>();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(() => useStaffActions(7, member, { open }), { wrapper });
  return { ...rendered, requests, client, open };
}

const itemNamed = (items: StaffActionItem[], label: string) =>
  items.find((item) => item.label === label);

beforeEach(() => {
  startPreferences('en');
  render(<Toaster label="Notifications" closeLabel="Close notification" />);
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useStaffActions', () => {
  it('names the menu by its person, and asks before the access is removed or a password issued', () => {
    const { result, open } = renderActions(PENDING);

    expect(result.current.trigger.label.replace(/[\u2066-\u2069]/g, '')).toBe('Actions: Rahaf');
    act(() => {
      itemNamed(result.current.items, 'New temporary password')?.run();
    });
    act(() => {
      itemNamed(result.current.items, 'Remove access')?.run();
    });
    expect(open.mock.calls.map(([dialog]) => dialog.kind)).toEqual(['reissue', 'deactivate']);
    expect(itemNamed(result.current.items, 'Remove access')?.destructive).toBe(true);
  });

  it('holds «New temporary password» with its reason when none is pending, and on a deactivated row', () => {
    const settled = renderActions(RAHAF);
    expect(itemNamed(settled.result.current.items, 'New temporary password')).toMatchObject({
      disabled: true,
      reason:
        'They’ve changed the temporary password; if they forget their password, they recover it by email.',
    });

    const inactive = renderActions(INACTIVE);
    expect(itemNamed(inactive.result.current.items, 'New temporary password')).toMatchObject({
      disabled: true,
      reason: 'Give their access back first.',
    });
  });

  it('gives the access back at once, the row from the answer, with no toast', async () => {
    const shown = vi.spyOn(toast, 'success');
    const { result, client, requests } = renderActions(INACTIVE, () =>
      ok({ ...INACTIVE, isActive: true }),
    );

    act(() => {
      itemNamed(result.current.items, 'Give access back')?.run();
    });

    await waitFor(() => {
      expect(client.getQueryData(staffKeys.list(7))).toEqual([{ ...INACTIVE, isActive: true }]);
    });
    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'patch /manage/spaces/7/staff/15',
    ]);
    expect(shown).not.toHaveBeenCalled();
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('says a refused re-activation in a toast that stays, in the owner’s words', async () => {
    const shown = vi.spyOn(toast, 'error');
    const suspended = renderActions(INACTIVE, () =>
      refused(409, { type: 'conflict', code: 'ACCOUNT_SUSPENDED' }),
    );
    act(() => {
      itemNamed(suspended.result.current.items, 'Give access back')?.run();
    });
    expect(
      await findToast(
        'Their account is suspended by the Masaha team; their access comes back once it’s restored.',
      ),
    ).toBeInTheDocument();
    expect(shown).toHaveBeenCalledWith(
      expect.stringMatching(/Couldn’t give .*Rahaf.* their access back/),
      expect.objectContaining({ duration: Infinity }),
    );

    const admin = renderActions(INACTIVE, () =>
      refused(409, { type: 'conflict', code: 'ACCOUNT_IS_ADMIN' }),
    );
    act(() => {
      itemNamed(admin.result.current.items, 'Give access back')?.run();
    });
    expect(
      await findToast('This account is now an admin’s and doesn’t work at reception.'),
    ).toBeInTheDocument();
  });

  it('marks the menu busy while one of its row’s actions waits', async () => {
    let answer: (value: FakeAnswer) => void = () => undefined;
    const { result } = renderActions(
      INACTIVE,
      () =>
        new Promise<FakeAnswer>((resolve) => {
          answer = resolve;
        }),
    );

    act(() => {
      itemNamed(result.current.items, 'Give access back')?.run();
    });
    await waitFor(() => {
      expect(result.current.trigger.busy).toBe(true);
    });
    act(() => {
      answer(ok({ ...INACTIVE, isActive: true }));
    });
    await waitFor(() => {
      expect(result.current.trigger.busy).toBe(false);
    });
  });
});
