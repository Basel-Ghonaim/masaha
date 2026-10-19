import { Toaster, toast } from '@shared/design-system';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import type { NamedLineView } from '../../types/NamedLineView';
import { useUnlinkOwnerDialog } from './useUnlinkOwnerDialog';

/** The marks that isolate a name inside a line, so it never reorders the words around it. */
const FSI = String.fromCodePoint(0x2068);
const PDI = String.fromCodePoint(0x2069);

const RIMA = { id: 5, name: 'Rima' };
const SAMI = { id: 6, name: 'Sami' };
const FOCUS_HUB = { id: 7, name: { text: 'Focus Hub' } };

/** The space as the server reads it, with these owners. */
const spaceWith = (owners: { id: number; name: string }[]): FakeAnswer =>
  ok({ id: 7, isVerified: owners.length > 0, owners });

/**
 * The dialog unlinking Rima from Focus Hub; the server answers the space's read with `read` and the
 * unlink with `unlink`.
 */
function renderDialog(
  read: () => FakeAnswer | Promise<FakeAnswer>,
  unlink: () => FakeAnswer = () => ({ status: 204 }),
) {
  const requests = fakeTransport((request) => (request.method === 'get' ? read() : unlink()));
  const close = vi.fn();
  const rendered = renderHook(
    () => useUnlinkOwnerDialog({ space: FOCUS_HUB, owner: RIMA }, close),
    { wrapper: queryWrapper() },
  );
  return { ...rendered, requests, close };
}

/** A line as it reads, the name inside it. */
const text = (line: NamedLineView | string | null) =>
  line === null || typeof line === 'string' ? line : `${line.before}${line.name.text}${line.after}`;

/** The toast whose title reads `text`, isolates and all, once it shows. */
const toastTitled = (title: string) =>
  findToast(
    (_content, element) =>
      element?.hasAttribute('data-title') === true && element.textContent === title,
  );

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useUnlinkOwnerDialog', () => {
  it('says the space turns unverified when this is its last owner, as the server reads it', async () => {
    render(<Toaster label="Notifications" />);
    const { result, requests, close } = renderDialog(() => spaceWith([RIMA]));

    expect(text(result.current.title)).toBe(`Unlink ${FSI}Rima${PDI} from Focus Hub?`);
    await waitFor(() => {
      expect(text(result.current.consequence)).toBe(
        'Focus Hub becomes unverified, its live status disappears, and the Masaha team edits it.',
      );
    });
    expect(requests[0]).toMatchObject({ method: 'get', url: '/admin/spaces/7' });

    await act(async () => {
      await result.current.confirm.run();
    });

    expect(requests.filter((request) => request.method === 'delete')).toMatchObject([
      { url: '/admin/spaces/7/owners/5' },
    ]);
    expect(close).toHaveBeenCalledTimes(1);
    expect(await toastTitled(`${FSI}Rima${PDI} unlinked from Focus Hub`)).toBeInTheDocument();
    expect(await findToast('The space is now unverified')).toBeInTheDocument();
  });

  it('says the others stay when it has other owners', async () => {
    const { result } = renderDialog(() => spaceWith([RIMA, SAMI]));

    await waitFor(() => {
      expect(text(result.current.consequence)).toBe(
        'The other owners stay, and it stays verified.',
      );
    });
  });

  it('reads the owners again on each opening, and waits for that read before it words or allows the unlink', async () => {
    // Rima is Focus Hub's only owner at the first opening; Sami is linked before the second.
    let answer: () => FakeAnswer | Promise<FakeAnswer> = () => spaceWith([RIMA]);
    fakeTransport(() => answer());
    // One cache for both openings, as the page keeps it.
    const wrapper = queryWrapper();
    const open = () =>
      renderHook(() => useUnlinkOwnerDialog({ space: FOCUS_HUB, owner: RIMA }, vi.fn()), {
        wrapper,
      });

    const first = open();
    await waitFor(() => {
      expect(text(first.result.current.consequence)).toBe(
        'Focus Hub becomes unverified, its live status disappears, and the Masaha team edits it.',
      );
    });
    first.unmount();

    const read = deferred<FakeAnswer>();
    answer = () => read.promise;
    const second = open();

    // The first opening's answer is never the second's.
    expect(second.result.current.consequence).toBeNull();
    expect(second.result.current.confirm.disabled).toBe(true);

    read.resolve(spaceWith([RIMA, SAMI]));

    await waitFor(() => {
      expect(text(second.result.current.consequence)).toBe(
        'The other owners stay, and it stays verified.',
      );
    });
    expect(second.result.current.confirm.disabled).toBe(false);
  });

  it('holds the action until the owners are read', async () => {
    const read = deferred<FakeAnswer>();
    const { result } = renderDialog(() => read.promise);

    expect(result.current.consequence).toBeNull();
    expect(result.current.confirm.disabled).toBe(true);

    read.resolve(spaceWith([RIMA]));

    await waitFor(() => {
      expect(result.current.confirm.disabled).toBe(false);
    });
  });

  it('says what holds whatever the owners, when they could not be read', async () => {
    const { result } = renderDialog(() => refused(403, { type: 'forbidden' }));

    await waitFor(() => {
      expect(text(result.current.consequence)).toBe(
        'If they are its only owner, it becomes unverified and its live status disappears.',
      );
    });
    expect(result.current.confirm.disabled).toBe(false);
  });

  it('words a space deleted meanwhile, and stays open', async () => {
    const { result, close } = renderDialog(
      () => spaceWith([RIMA]),
      () => refused(404, { type: 'not_found' }),
    );

    await waitFor(() => {
      expect(result.current.confirm.disabled).toBe(false);
    });
    await act(async () => {
      await result.current.confirm.run();
    });

    expect(result.current.failure).toMatchObject({
      kind: 'refused',
      title: 'Not unlinked',
      message: 'The space was deleted meanwhile.',
    });
    expect(close).not.toHaveBeenCalled();
  });
});
