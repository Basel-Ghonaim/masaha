import { Toaster, toast } from '@shared/design-system';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { bodyOf, fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { recordAdminHandover } from '../../repository/adminHandover';
import type { RecordHandover } from '../../types/RecordHandover';
import { useTemporaryPasswordDialog } from './useTemporaryPasswordDialog';

type Dialog = ReturnType<typeof useTemporaryPasswordDialog>;

const PERSON = { userId: 12, name: 'Rima', email: 'rima@example.com' };

/** The marks that isolate a name inside a line, so it never reorders the words around it. */
const FSI = String.fromCodePoint(0x2068);
const PDI = String.fromCodePoint(0x2069);

/** The browser's clipboard, a platform seam jsdom leaves out, writing as `writeText` does. */
function stubClipboard(writeText: (text: string) => Promise<void>) {
  const spy = vi.fn(writeText);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: spy }, configurable: true });
  return spy;
}

/**
 * The dialog's state for Rima's password, the handover recorded by `recordHandover` (the admin's,
 * by default), the server answering it with `answer`.
 */
function renderDialog(
  answer: () => FakeAnswer | Promise<FakeAnswer> = () => ({ status: 204 }),
  recordHandover: RecordHandover = recordAdminHandover,
) {
  const requests = fakeTransport(answer);
  const onDone = vi.fn();
  const channelRef = { current: document.createElement('div') };
  const focus = vi.spyOn(channelRef.current, 'focus');
  const rendered = renderHook(
    () =>
      useTemporaryPasswordDialog({
        person: PERSON,
        password: 'Tmp-4821-xk',
        kind: 'created',
        onDone,
        channelRef,
        recordHandover,
      }),
    { wrapper: queryWrapper() },
  );
  return { ...rendered, requests, onDone, focus };
}

/** Copies the password, then chooses WhatsApp unless told not to. */
async function copyAndChoose(dialog: () => Dialog, choose = true) {
  await act(async () => {
    await dialog().copy.run();
  });
  if (choose) {
    act(() => {
      dialog().channel.choose('WHATSAPP');
    });
  }
}

beforeEach(() => {
  startPreferences('en');
  stubClipboard(() => Promise.resolve());
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('useTemporaryPasswordDialog', () => {
  it('waits for the copy before it lets the admin finish, and copies the password', async () => {
    const writeText = stubClipboard(() => Promise.resolve());
    const { result } = renderDialog();

    expect(result.current.done).toMatchObject({
      disabled: true,
      reason: 'Copy it first — it won’t be shown again',
    });

    await act(async () => {
      await result.current.copy.run();
    });

    expect(writeText).toHaveBeenCalledWith('Tmp-4821-xk');
    expect(result.current.copy.copied).toBe(true);
    expect(result.current.copyFailed).toBeNull();
    expect(result.current.done).toMatchObject({ disabled: false, reason: undefined });
  });

  it('lets the admin finish when the copy fails, saying to copy it by hand', async () => {
    stubClipboard(() => Promise.reject(new Error('Not allowed')));
    const { result } = renderDialog();

    await act(async () => {
      await result.current.copy.run();
    });

    expect(result.current.copyFailed).toBe('We couldn’t copy it — select it and copy it by hand.');
    expect(result.current.done.disabled).toBe(false);
  });

  it('asks how it was handed over before it records anything', async () => {
    const { result, requests, onDone, focus } = renderDialog();

    await copyAndChoose(() => result.current, false);
    await act(async () => {
      await result.current.done.run();
    });

    expect(result.current.channel.error).toBe('Choose how it was handed over');
    expect(focus).toHaveBeenCalled();
    expect(requests).toHaveLength(0);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('lets the place close only once the handover is recorded, and says so', async () => {
    render(<Toaster label="Notifications" />);
    const answer = deferred<FakeAnswer>();
    const { result, requests, onDone } = renderDialog(() => answer.promise);

    await copyAndChoose(() => result.current);
    act(() => {
      void result.current.done.run();
    });

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(requests[0]).toMatchObject({
      method: 'post',
      url: '/admin/users/12/temporary-password/handover',
    });
    expect(bodyOf(requests[0])).toEqual({ channel: 'WHATSAPP' });
    expect(onDone).not.toHaveBeenCalled();

    answer.resolve({ status: 204 });

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledTimes(1);
    });
    // The person's name isolated inside the line.
    expect(await findToast(`Handover recorded: ${FSI}Rima${PDI} · WhatsApp`)).toBeInTheDocument();
  });

  it('records the handover through the write its caller gives', async () => {
    const recordHandover = vi.fn<RecordHandover>(() => Promise.resolve());
    const { result, requests, onDone } = renderDialog(undefined, recordHandover);

    await copyAndChoose(() => result.current);
    await act(async () => {
      await result.current.done.run();
    });

    expect(recordHandover).toHaveBeenCalledExactlyOnceWith({ userId: 12, channel: 'WHATSAPP' });
    expect(requests).toHaveLength(0);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open on a failure, with its reason', async () => {
    const { result, onDone } = renderDialog(() => refused(500, { type: 'server' }));

    await copyAndChoose(() => result.current);
    await act(async () => {
      await result.current.done.run();
    });

    await waitFor(() => {
      expect(result.current.failure).toMatchObject({
        kind: 'refused',
        title: 'We couldn’t record the handover',
      });
    });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('keeps «Done» blocked while a refused handover’s wait counts down', async () => {
    const { result, onDone } = renderDialog(() =>
      refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }),
    );

    await copyAndChoose(() => result.current);
    await act(async () => {
      await result.current.done.run();
    });

    await waitFor(() => {
      expect(result.current.failure).toMatchObject({ kind: 'rateLimit' });
    });
    expect(result.current.done.disabled).toBe(true);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('closes on a password no longer pending, saying the handover was not recorded', async () => {
    render(<Toaster label="Notifications" />);
    const { result, onDone } = renderDialog(() =>
      refused(409, { type: 'conflict', code: 'TEMPORARY_PASSWORD_NOT_PENDING' }),
    );

    await copyAndChoose(() => result.current);
    await act(async () => {
      await result.current.done.run();
    });

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(await findToast('The handover wasn’t recorded')).toBeInTheDocument();
    expect(result.current.failure).toBeNull();
  });
});
