import { establishSession, restoreSession } from '@shared/session';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../../../test/fakeSession';
import { setSessionHint } from '../../../../test/sessionHint';
import { startPreferences } from '../../../../test/startPreferences';
import { dropReport } from '../intent/reportIntent';
import { useReportAction } from './useReportAction';

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
    const guest = renderHook(() => useReportAction({ slug: 'masaha-hub', signIn }));

    expect(guest.result.current.trigger.label).toBe('Report wrong information');
    act(() => {
      guest.result.current.trigger.run();
    });
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith('report', expect.any(Function));
    expect(guest.result.current.open).toBe(false);
    guest.unmount();

    signInAs();
    const back = renderHook(() => useReportAction({ slug: 'masaha-hub', signIn }));
    expect(back.result.current.open).toBe(true);
    act(() => {
      back.result.current.close();
    });
    expect(back.result.current.open).toBe(false);
    back.unmount();

    const again = renderHook(() => useReportAction({ slug: 'masaha-hub', signIn }));
    expect(again.result.current.open).toBe(false);
  });

  it('opens nothing on a page reached by a link alone, nor for a report the guest let go', async () => {
    await becomeGuest();
    const signIn = vi.fn<(reason: 'report', cancel: () => void) => void>();
    const guest = renderHook(() => useReportAction({ slug: 'masaha-hub', signIn }));
    act(() => {
      guest.result.current.trigger.run();
    });
    // The guest closes the sign-in without going on.
    signIn.mock.calls[0]?.[1]();
    guest.unmount();

    signInAs();
    expect(
      renderHook(() => useReportAction({ slug: 'masaha-hub', signIn })).result.current.open,
    ).toBe(false);
    expect(renderHook(() => useReportAction({ slug: 'old-hub', signIn })).result.current.open).toBe(
      false,
    );
  });

  it('opens the dialog at once for a signed-in user, asking no sign-in', () => {
    signInAs();
    const signIn = vi.fn();
    const { result } = renderHook(() => useReportAction({ slug: 'masaha-hub', signIn }));

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
