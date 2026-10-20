import { Toaster, toast } from '@shared/design-system';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { bodyOf, fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import type { AccountPerson } from '../../types/AccountPerson';
import { useAccountActions } from './useAccountActions';

/** The marks that isolate a name inside a line, so it never reorders the words around it. */
const FSI = String.fromCodePoint(0x2068);
const PDI = String.fromCodePoint(0x2069);

const RIMA: AccountPerson = {
  id: 5,
  name: 'Rima',
  email: 'rima@example.com',
  isSuspended: false,
  hasPassword: true,
  ownsSpaces: false,
  atDesk: false,
};
const SUSPENDED: AccountPerson = { ...RIMA, isSuspended: true };

/** The account actions for `person`, the server answering with `answer`; `open` takes a dialog. */
function renderActions(person: AccountPerson, answer: () => FakeAnswer = () => ({ status: 204 })) {
  const requests = fakeTransport(answer);
  const open = vi.fn();
  const rendered = renderHook(() => useAccountActions(person, { open }), {
    wrapper: queryWrapper(),
  });
  return { ...rendered, requests, open };
}

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

describe('useAccountActions', () => {
  it('offers to suspend an active account and to restore a suspended one', () => {
    const { result: active, open } = renderActions(RIMA);
    expect(active.current.state).toMatchObject({
      label: 'Suspend',
      disabled: false,
      destructive: true,
    });

    act(() => {
      active.current.state.run();
    });

    expect(open).toHaveBeenCalledExactlyOnceWith({ kind: 'suspend', person: RIMA });

    const suspended = renderActions(SUSPENDED).result;
    expect(suspended.current.state).toMatchObject({
      label: 'Restore the account',
      disabled: false,
      destructive: false,
    });
  });

  it('restores at once, then says so; a refusal is said in a toast', async () => {
    render(<Toaster label="Notifications" />);
    const { result, requests, open } = renderActions(SUSPENDED);

    act(() => {
      result.current.state.run();
    });

    expect(await toastTitled(`${FSI}Rima${PDI}’s account restored`)).toBeInTheDocument();
    expect(requests.map((request) => [request.method, request.url])).toEqual([
      ['put', '/admin/users/5/suspended'],
    ]);
    expect(bodyOf(requests[0])).toEqual({ isSuspended: false });
    expect(open).not.toHaveBeenCalled();

    restoreTransport();
    const refusedOne = renderActions(SUSPENDED, () => refused(404, { type: 'not_found' }));

    act(() => {
      refusedOne.result.current.state.run();
    });

    const failure = await toastTitled(`We couldn’t restore ${FSI}Rima${PDI}’s account`);
    await waitFor(() => {
      expect(failure.closest('[data-sonner-toast]')).toHaveAttribute('data-type', 'error');
    });
    expect(await findToast('We couldn’t find what you were looking for.')).toBeInTheDocument();
    expect(refusedOne.open).not.toHaveBeenCalled();
  });
});
