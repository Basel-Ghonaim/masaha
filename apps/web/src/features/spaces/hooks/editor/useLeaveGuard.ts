import { useCopy } from '@shared/copy';
import { useEffect } from 'react';
import { useBlocker } from 'react-router';

/**
 * Asks before the page is left while a Sheet has changes (`unsaved`, its section's name) or while a
 * file is still being uploaded (`uploading`). A navigation to another page, by a link or Back, waits
 * on the dialog this returns, which names the section and says its changes are being saved while a
 * save is pending (`saving`); a move within the page, to a section's anchor, never asks. Once nothing
 * is left unsaved while it asks, the navigation goes on. Closing or reloading the tab asks through
 * the browser's own prompt.
 *
 * With only an upload running the dialog says what is really lost — a photo that has not finished
 * going up — and names no section, because none of them is unsaved.
 */
export function useLeaveGuard(unsaved: string | null, saving: boolean, uploading: boolean) {
  const copy = useCopy();
  const words = copy.spaces.editor.leave;
  const guarding = unsaved !== null || uploading;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      guarding && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!guarding) return undefined;
    const ask = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', ask);
    return () => {
      window.removeEventListener('beforeunload', ask);
    };
  }, [guarding]);

  // A Sheet saved or discarded while the dialog was open leaves nothing to lose: the user goes on.
  useEffect(() => {
    if (blocker.state === 'blocked' && !guarding) blocker.proceed();
  }, [blocker, guarding]);

  const section = unsaved ?? '';
  const uploadingOnly = unsaved === null && uploading;
  return {
    open: blocker.state === 'blocked',
    title: uploadingOnly ? words.uploadTitle : words.title,
    description: uploadingOnly
      ? words.uploading
      : saving
        ? words.saving({ section })
        : words.description({ section }),
    stay: {
      label: words.stay,
      run: () => {
        blocker.reset?.();
      },
    },
    leave: {
      label: words.leave,
      run: () => {
        blocker.proceed?.();
      },
    },
  };
}
