import { useCopy } from '@shared/copy';
import { setLanguage, setTheme } from '@shared/preferences';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrap } from './bootstrap';
import { AppProviders } from './providers';

function Probe() {
  return <p>{useCopy().terms.space}</p>;
}

beforeEach(() => {
  // jsdom has no media queries; this device prefers the light scheme.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  window.localStorage.clear();
  document.documentElement.lang = 'ar';
  bootstrap();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the preferences, wired at bootstrap', () => {
  it('render the copy again, and turn <html>, when the language changes', () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    expect(screen.getByText('مساحة')).toBeInTheDocument();

    act(() => {
      setLanguage('en');
    });

    expect(screen.getByText('Space')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'en');
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
  });

  it('set data-theme on <html> when the theme changes', () => {
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    setTheme('dark');

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem('masaha.theme')).toBe('dark');
  });
});
