import { act, waitFor } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHookInRouter } from '../../../../test/renderHookInRouter';
import { startPreferences } from '../../../../test/startPreferences';
import { useLeaveGuard } from './useLeaveGuard';

/** What the editor hands the guard: the unsaved sections' names, and whether a save or an upload is
 *  pending. */
type Inputs = { unsaved: string[]; saving: boolean; uploading: boolean };

/** The guard with inputs the test changes as the editor would, each change rendering it again. */
function renderGuard(initial: Partial<Inputs> = {}) {
  let inputs: Inputs = { unsaved: [], saving: false, uploading: false, ...initial };
  const listeners = new Set<() => void>();
  const set = (next: Partial<Inputs>) => {
    inputs = { ...inputs, ...next };
    act(() => {
      for (const listener of listeners) listener();
    });
  };
  const rendered = renderHookInRouter(() => {
    const current = useSyncExternalStore(
      (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      () => inputs,
    );
    return useLeaveGuard(current.unsaved, current.saving, current.uploading);
  });
  return { ...rendered, set };
}

/** Whether the browser is asked before the tab closes or reloads. */
function unloadAsks() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useLeaveGuard', () => {
  it('asks before another page while sections are unsaved, naming them, and Stay keeps the page', async () => {
    const { result, router } = renderGuard({ unsaved: ['The space', 'Contacts'], saving: false });

    await act(() => router.navigate('/elsewhere'));

    expect(result.current.open).toBe(true);
    expect(result.current.description).toBe(
      'Unsaved changes in The space and Contacts will be lost.',
    );
    act(() => {
      result.current.stay.run();
    });
    expect(router.state.location.pathname).toBe('/page');
    expect(result.current.open).toBe(false);
  });

  it('goes on to the page asked for on Leave', async () => {
    const { result, router } = renderGuard({ unsaved: ['The space'], saving: false });
    await act(() => router.navigate('/elsewhere'));

    act(() => {
      result.current.leave.run();
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/elsewhere');
    });
  });

  it('never asks for a move within the page, to a section', async () => {
    const { result, router } = renderGuard({ unsaved: ['The space'], saving: false });

    await act(() => router.navigate({ hash: '#contacts' }));

    expect(router.state.location.hash).toBe('#contacts');
    expect(result.current.open).toBe(false);
  });

  it('stops asking once nothing is unsaved: neither a navigation nor the browser', async () => {
    const { result, router, set } = renderGuard({ unsaved: ['The space'], saving: false });
    expect(unloadAsks()).toBe(true);

    set({ unsaved: [] });

    expect(unloadAsks()).toBe(false);
    await act(() => router.navigate('/elsewhere'));
    expect(result.current.open).toBe(false);
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('goes on to the page asked for once the changes are saved while it asks', async () => {
    const { router, set } = renderGuard({ unsaved: ['The space'], saving: true });
    await act(() => router.navigate('/elsewhere'));

    set({ unsaved: [], saving: false });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/elsewhere');
    });
  });

  it('says the changes are being saved, not lost, while a save is pending', async () => {
    const { result, router } = renderGuard({ unsaved: ['The space'], saving: true });

    await act(() => router.navigate('/elsewhere'));

    expect(result.current.description).toBe('The changes in The space are being saved.');
  });

  it('asks the browser before the tab closes or reloads only while sections are unsaved', () => {
    renderGuard({ unsaved: [], saving: false });
    expect(unloadAsks()).toBe(false);
  });

  it('asks while an upload is running, names no section, and lets a move within the page through', async () => {
    const { result, router } = renderGuard({ uploading: true });

    expect(unloadAsks()).toBe(true);
    await act(() => router.navigate({ hash: '#photos' }));
    expect(router.state.location.hash).toBe('#photos');
    expect(result.current.open).toBe(false);

    await act(() => router.navigate('/elsewhere'));

    expect(result.current.open).toBe(true);
    expect(result.current.title).toBe('Leave while an upload is running?');
    expect(result.current.description).toBe(
      'A photo that has not finished uploading will be lost.',
    );
    act(() => {
      result.current.stay.run();
    });
    expect(router.state.location.pathname).toBe('/page');
  });

  it('goes on by itself once the upload has ended', async () => {
    const { router, set } = renderGuard({ uploading: true });
    await act(() => router.navigate('/elsewhere'));

    set({ uploading: false });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/elsewhere');
    });
  });

  it('still names the sections while one is unsaved and an upload runs too', async () => {
    const { result, router } = renderGuard({ unsaved: ['The space'], uploading: true });

    await act(() => router.navigate('/elsewhere'));

    expect(result.current.title).toBe('Leave with unsaved changes?');
    expect(result.current.description).toBe('Unsaved changes in The space will be lost.');
  });
});
