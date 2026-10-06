import { useLanguage } from '@shared/localisation';
import { usePreferences } from '@shared/preferences';
import { useEffect, useRef, useState } from 'react';
import { loadGoogleIdentity, onGoogleCredential } from '../../services/googleIdentity';
import type { GoogleIdentity } from '../../types/GoogleIdentity';

/** Google renders its button no wider than this. */
const MAX_WIDTH = 400;

/** Masaha's Google client id, set at build time; without it, Google sign-in is not offered. */
function clientIdOf(configured: string | undefined): string | undefined {
  return configured === undefined || configured === '' ? undefined : configured;
}

/** Google's API, and the language its script ran in. */
type Loaded = { identity: GoogleIdentity; language: string };

/**
 * Google's own button, rendered into the element `ref` is given: it loads Google's script in the
 * interface's language, and hands each ID token Google returns to `onCredential`. Google words the
 * button in its script's language, so a change of language loads the script again and the button is
 * drawn once it has run. The button follows the theme shown (outline, or filled black in the dark)
 * and the element's width, and is drawn again when either changes. Without a client id it is not
 * `available` and loads nothing.
 */
export function useGoogleButton(onCredential: (idToken: string) => void) {
  const clientId = clientIdOf(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const theme = usePreferences((preferences) => preferences.theme);
  const language = useLanguage();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const credential = useRef(onCredential);

  useEffect(() => {
    credential.current = onCredential;
  });

  useEffect(() => {
    if (clientId === undefined) return;
    return onGoogleCredential((idToken) => {
      credential.current(idToken);
    });
  }, [clientId]);

  useEffect(() => {
    if (clientId === undefined) return;
    let current = true;
    loadGoogleIdentity(clientId, language).then(
      (identity) => {
        if (current) setLoaded({ identity, language });
      },
      () => {
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [clientId, language]);

  useEffect(() => {
    if (!element) return;
    // The observer reports the element's width as it starts, then each time it changes.
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.min(Math.round(entry.contentRect.width), MAX_WIDTH));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element]);

  useEffect(() => {
    // Until the script in the interface's language has run, the button would be in the last one.
    if (!loaded || loaded.language !== language || !element) return;
    loaded.identity.renderButton(element, {
      type: 'standard',
      theme: theme === 'dark' ? 'filled_black' : 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'center',
      locale: language,
      ...(width > 0 ? { width } : {}),
    });
    return () => {
      element.replaceChildren();
    };
  }, [loaded, element, theme, language, width]);

  return {
    available: clientId !== undefined,
    status: failed ? ('failed' as const) : loaded ? ('ready' as const) : ('loading' as const),
    ref: setElement,
  };
}
