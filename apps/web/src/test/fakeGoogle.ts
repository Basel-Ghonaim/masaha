import { vi } from 'vitest';

/** The client id the tests configure, as `VITE_GOOGLE_CLIENT_ID` would. */
export const CLIENT_ID = 'masaha-test.apps.googleusercontent.com';

/** The address of Google Identity Services' script. */
export const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';

type Config = {
  client_id: string;
  callback: (response: { credential?: string }) => void;
  ux_mode?: string;
  auto_select?: boolean;
};
type ButtonOptions = { theme: string; locale: string; text?: string; width?: number };

// Each installed fake's watch on the page, stopped by `clearGoogle`.
const observers = new Set<MutationObserver>();

/**
 * Google Identity Services as its script leaves it on the page (`google.accounts.id`), recording how
 * it is initialised and each button it draws. Its button is a plain one named "Continue with Google".
 */
export function fakeGoogle() {
  const configs: Config[] = [];
  const buttons: ButtonOptions[] = [];
  /** The language (`hl`) of each Google script the page loaded. */
  const scripts: string[] = [];
  const id = {
    initialize: (config: Config) => {
      configs.push(config);
    },
    renderButton: (parent: HTMLElement, options: ButtonOptions) => {
      buttons.push(options);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Continue with Google';
      parent.replaceChildren(button);
    },
  };

  return {
    configs,
    buttons,
    scripts,
    /**
     * Puts Google's API on the page, as its script does when it runs, and plays the network from then
     * on: each Google script the page adds loads and runs (jsdom loads none).
     */
    install: () => {
      vi.stubGlobal('google', { accounts: { id } });
      const observer = new MutationObserver((records) => {
        for (const node of records.flatMap((record) => [...record.addedNodes])) {
          if (node instanceof HTMLScriptElement && node.src.startsWith(GOOGLE_SCRIPT)) {
            scripts.push(new URL(node.src).searchParams.get('hl') ?? '');
            node.dispatchEvent(new Event('load'));
          }
        }
      });
      observer.observe(document.head, { childList: true });
      observers.add(observer);
    },
    /** The person chooses their account in Google's window, and Google hands back the ID token. */
    choose: (credential: string) => {
      configs.at(-1)?.callback({ credential });
    },
  };
}

/** Google's script on the page, while it loads; none once it has run or failed. */
export function googleScript(): HTMLScriptElement | null {
  return document.head.querySelector(`script[src^="${GOOGLE_SCRIPT}"]`);
}

/** Stops every fake loading Google's scripts, and removes those a test left, so the next starts clean. */
export function clearGoogle(): void {
  observers.forEach((observer) => {
    observer.disconnect();
  });
  observers.clear();
  document.head.querySelectorAll('script').forEach((script) => {
    script.remove();
  });
}
