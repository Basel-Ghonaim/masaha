import type { GoogleIdentity } from '../types/GoogleIdentity';

/** Google Identity Services' script, loaded from Google only when a page shows its button. */
const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

// Google asks for one `initialize` per page; each loaded script is initialised once.
const initialised = new WeakSet<GoogleIdentity>();

// The one button on the page receives the credential; none once its page has gone.
let credentialHandler: ((idToken: string) => void) | null = null;

// Google words its button in the language of the script that ran last (its `hl`), whatever the
// button's own `locale` asks for; each language's script loads once at a time.
let scriptLanguage: string | undefined;
const loading = new Map<string, Promise<GoogleIdentity>>();

/** Google's API on the page, once its script has run. */
function loadedIdentity(): GoogleIdentity | undefined {
  return (globalThis as { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id;
}

/**
 * Google's API, its script run in `language`: at once when the last script that ran was in it, else
 * once a script in `language` loads. The element goes once it has run or failed, so a failed load is
 * tried again by a later visit, and a change of language loads the script again.
 */
function loadScript(language: string): Promise<GoogleIdentity> {
  const ready = loadedIdentity();
  if (ready && scriptLanguage === language) return Promise.resolve(ready);
  const pending = loading.get(language);
  if (pending) return pending;

  const load = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${SCRIPT_URL}?hl=${encodeURIComponent(language)}`;
    script.async = true;
    const settle = () => {
      loading.delete(language);
      script.remove();
    };
    script.addEventListener(
      'load',
      () => {
        settle();
        const identity = loadedIdentity();
        if (identity) {
          scriptLanguage = language;
          resolve(identity);
        } else {
          reject(new Error('Google Identity Services did not run.'));
        }
      },
      { once: true },
    );
    script.addEventListener(
      'error',
      () => {
        settle();
        reject(new Error('Google Identity Services did not load.'));
      },
      { once: true },
    );
    document.head.append(script);
  });
  loading.set(language, load);
  return load;
}

/**
 * Google's API in `language`, initialised with Masaha's client id: the button opens Google's window,
 * and never signs anyone in on its own. Each credential goes to the handler `onGoogleCredential` set.
 */
export async function loadGoogleIdentity(
  clientId: string,
  language: string,
): Promise<GoogleIdentity> {
  const identity = await loadScript(language);
  if (!initialised.has(identity)) {
    identity.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        if (credential) credentialHandler?.(credential);
      },
      ux_mode: 'popup',
      auto_select: false,
    });
    initialised.add(identity);
  }
  return identity;
}

/** Sends each credential Google hands back to `handler`, until the returned function stops it. */
export function onGoogleCredential(handler: (idToken: string) => void): () => void {
  credentialHandler = handler;
  return () => {
    if (credentialHandler === handler) credentialHandler = null;
  };
}
