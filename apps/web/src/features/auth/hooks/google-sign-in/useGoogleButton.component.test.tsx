import { setLanguage, setTheme } from '@shared/preferences';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLIENT_ID, fakeGoogle, googleScript, clearGoogle } from '../../../../test/fakeGoogle';
import { startPreferences } from '../../../../test/startPreferences';
import { useGoogleButton } from './useGoogleButton';

/**
 * The hook, with the element its button is drawn into, as `ContinueWithGoogle` gives it one, and
 * `onCredential` receiving what Google hands back.
 */
function renderButton(onCredential: (idToken: string) => void = vi.fn()) {
  const element = document.createElement('div');
  document.body.append(element);
  const rendered = renderHook(() => useGoogleButton(onCredential));
  act(() => {
    rendered.result.current.ref(element);
  });
  return { ...rendered, element };
}

beforeEach(() => {
  startPreferences('ar');
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  clearGoogle();
  document.body.replaceChildren();
});

describe('useGoogleButton', () => {
  it('offers nothing, and loads nothing, without a client id', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');

    const { result } = renderButton();

    expect(result.current.available).toBe(false);
    expect(googleScript()).toBeNull();
  });

  it("initialises Google once with Masaha's client id, and draws its outline button in the interface's language", async () => {
    const google = fakeGoogle();
    google.install();

    const { result, element } = renderButton();

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(google.configs).toEqual([
      expect.objectContaining({ client_id: CLIENT_ID, ux_mode: 'popup', auto_select: false }),
    ]);
    expect(google.buttons).toEqual([
      expect.objectContaining({ theme: 'outline', locale: 'ar', text: 'continue_with' }),
    ]);
    expect(element.childElementCount).toBe(1);
  });

  it("draws the button again, filled black, when the theme turns dark, and in the language chosen next once Google's script in it has run", async () => {
    const google = fakeGoogle();
    google.install();
    const { element } = renderButton();
    await waitFor(() => {
      expect(google.buttons).toHaveLength(1);
    });

    act(() => {
      setTheme('dark');
    });
    expect(google.buttons.at(-1)).toMatchObject({ theme: 'filled_black', locale: 'ar' });

    act(() => {
      setLanguage('en');
    });
    await waitFor(() => {
      expect(google.buttons.at(-1)).toMatchObject({ theme: 'filled_black', locale: 'en' });
    });
    expect(google.scripts.at(-1)).toBe('en');
    expect(element.childElementCount).toBe(1);
    expect(google.configs).toHaveLength(1);
  });

  it('initialises Google once over two visits, and hands a credential only to the button on the page', async () => {
    const google = fakeGoogle();
    google.install();
    const firstVisit = vi.fn();
    const first = renderButton(firstVisit);
    await waitFor(() => {
      expect(google.buttons).toHaveLength(1);
    });

    first.unmount();
    act(() => {
      google.choose('token-after-leaving');
    });
    const secondVisit = vi.fn();
    renderButton(secondVisit);
    await waitFor(() => {
      expect(google.buttons).toHaveLength(2);
    });
    act(() => {
      google.choose('token-second-visit');
    });

    expect(google.configs).toHaveLength(1);
    expect(firstVisit).not.toHaveBeenCalled();
    expect(secondVisit).toHaveBeenCalledTimes(1);
    expect(secondVisit).toHaveBeenCalledWith('token-second-visit');
  });

  it("loads Google's script in the interface's language when the page has none, and draws the button once it has run", async () => {
    const google = fakeGoogle();
    const { result } = renderButton();
    const script = googleScript();
    expect(script).not.toBeNull();
    expect(new URL(script?.src ?? '').searchParams.get('hl')).toBe('ar');
    expect(result.current.status).toBe('loading');

    google.install();
    act(() => {
      script?.dispatchEvent(new Event('load'));
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(google.buttons).toHaveLength(1);
  });

  it("fails when Google's script can't load, and removes it so a later visit tries again", async () => {
    const { result } = renderButton();

    act(() => {
      googleScript()?.dispatchEvent(new Event('error'));
    });

    await waitFor(() => {
      expect(result.current.status).toBe('failed');
    });
    expect(googleScript()).toBeNull();
  });
});
