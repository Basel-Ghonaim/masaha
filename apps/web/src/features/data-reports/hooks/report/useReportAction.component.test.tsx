import { establishSession, passwordChanged, restoreSession } from '@shared/session';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../../../test/fakeSession';
import { setSessionHint } from '../../../../test/sessionHint';
import { startPreferences } from '../../../../test/startPreferences';
import { dropReport } from '../intent/reportIntent';
import { useReportAction } from './useReportAction';

const NAME = { text: 'Masaha Hub' };

async function becomeGuest() {
  setSessionHint(false);
  await restoreSession();
}

function signInAs() {
  establishSession(aSession(), { source: 'signIn' });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  dropReport();
  document.cookie = 'masaha_session=; Path=/; Max-Age=0';
});

describe('useReportAction', () => {
  it('holds a guest’s press and asks the sign-in for a report; back signed in, the dialog opens once', async () => {
    await becomeGuest();
    const signIn = vi.fn();
    const guest = renderHook(() => useReportAction({ slug: 'masaha-hub', name: NAME, signIn }));

    expect(guest.result.current.trigger.label).toBe('Report wrong information');
    act(() => {
      guest.result.current.trigger.run();
    });
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith('report', expect.any(Function));
    expect(guest.result.current.open).toBe(false);
    guest.unmount();

    signInAs();
    const back = renderHook(() => useReportAction({ slug: 'masaha-hub', name: NAME, signIn }));
    expect(back.result.current.open).toBe(true);
    act(() => {
      back.result.current.close();
    });
    expect(back.result.current.open).toBe(false);
    back.unmount();

    const again = renderHook(() => useReportAction({ slug: 'masaha-hub', name: NAME, signIn }));
    expect(again.result.current.open).toBe(false);
  });

  it('keeps the report held while a temporary password is still to change, and opens it after', async () => {
    await becomeGuest();
    const signIn = vi.fn();
    const page = renderHook(() => useReportAction({ slug: 'masaha-hub', name: NAME, signIn }));
    act(() => {
      page.result.current.trigger.run();
    });

    act(() => {
      establishSession(aSession({ id: 1, mustChangePassword: true }), { source: 'signIn' });
    });
    // Opened now, its send would be refused PASSWORD_CHANGE_REQUIRED.
    expect(page.result.current.open).toBe(false);

    act(() => {
      passwordChanged(1, 'token-2');
    });
    expect(page.result.current.open).toBe(true);
  });

  it('lets the held report go on a sign-out, so the next account’s sign-in opens nothing (S-1)', async () => {
    await becomeGuest();
    const signIn = vi.fn();
    const page = renderHook(() => useReportAction({ slug: 'masaha-hub', name: NAME, signIn }));
    act(() => {
      page.result.current.trigger.run();
    });
    act(() => {
      establishSession(aSession({ id: 1, mustChangePassword: true }), { source: 'signIn' });
    });

    // Signed out on the change page, then someone else signs in in this tab.
    await act(() => becomeGuest());
    act(() => {
      establishSession(aSession({ id: 2, email: 'mona@example.com' }), { source: 'signIn' });
    });

    expect(page.result.current.open).toBe(false);
  });

  it('opens nothing on a page reached by a link alone, nor for a report the guest let go', async () => {
    await becomeGuest();
    const signIn = vi.fn<(reason: 'report', cancel: () => void) => void>();
    const guest = renderHook(() => useReportAction({ slug: 'masaha-hub', name: NAME, signIn }));
    act(() => {
      guest.result.current.trigger.run();
    });
    // The guest closes the sign-in without going on.
    signIn.mock.calls[0]?.[1]();
    guest.unmount();

    signInAs();
    expect(
      renderHook(() => useReportAction({ slug: 'masaha-hub', name: NAME, signIn })).result.current
        .open,
    ).toBe(false);
    expect(
      renderHook(() => useReportAction({ slug: 'old-hub', name: NAME, signIn })).result.current
        .open,
    ).toBe(false);
  });

  it('opens the dialog at once for a signed-in user, asking no sign-in', () => {
    signInAs();
    const signIn = vi.fn();
    const { result } = renderHook(() =>
      useReportAction({ slug: 'masaha-hub', name: NAME, signIn }),
    );

    act(() => {
      result.current.trigger.run();
    });
    expect(result.current.open).toBe(true);
    expect(signIn).not.toHaveBeenCalled();

    act(() => {
      result.current.close();
    });
    expect(result.current.open).toBe(false);
  });
});
