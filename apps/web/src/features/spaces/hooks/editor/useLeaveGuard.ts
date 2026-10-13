import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import { useEffect } from 'react';
import { useBlocker } from 'react-router';

/**
 * Asks before the page is left while some sections have unsaved changes (`unsaved`, their names). A
 * navigation to another page, by a link, Back or the sidebar, waits on the dialog this returns,
 * which names them, and says they are being saved while a save is pending (`saving`); a move within
 * the page, to a section's anchor, never asks. Once nothing is left unsaved while it asks, the
 * navigation goes on. Closing or reloading the tab asks through the browser's own prompt.
 */
export function useLeaveGuard(unsaved: string[], saving: boolean) {
  const copy = useCopy();
  const english = useLanguage() === 'en';
  const words = copy.spaces.editor.leave;
  const guarding = unsaved.length > 0;
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

  // A section saved or discarded while the dialog was open leaves nothing to lose: the admin goes on.
  useEffect(() => {
    if (blocker.state === 'blocked' && !guarding) blocker.proceed();
  }, [blocker, guarding]);

  const sections = new Intl.ListFormat(english ? 'en' : 'ar-u-nu-latn', {
    type: 'conjunction',
  }).format(unsaved);
  return {
    open: blocker.state === 'blocked',
    title: words.title,
    description: saving ? words.saving({ sections }) : words.description({ sections }),
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
