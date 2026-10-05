import type { QueryClient } from '@shared/api';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { setLanguage, setTheme } from '@shared/preferences';
import { useQueryClient } from '@tanstack/react-query';
import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrap } from './bootstrap';
import { AppProviders } from './providers';

function Probe() {
  return <p>{useCopy().terms.space}</p>;
}

// The app's one client, as bootstrap makes it for each test.
let queryClient: QueryClient;

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
  ({ queryClient } = bootstrap());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the preferences, wired at bootstrap', () => {
  it('render the copy again, and turn <html>, when the language changes', () => {
    render(
      <AppProviders queryClient={queryClient}>
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

describe('the toasts', () => {
  it('announce a toast raised anywhere in a region named in the interface’s language', async () => {
    render(
      <AppProviders queryClient={queryClient}>
        <Probe />
      </AppProviders>,
    );

    act(() => {
      toast.success('حُفظ');
    });

    expect(screen.getByRole('region', { name: 'الإشعارات' })).toBeInTheDocument();
    expect(await screen.findByText('حُفظ')).toBeVisible();
    act(() => {
      toast.dismiss();
    });
  });
});

describe('the server state', () => {
  it('provides the QueryClient it is given, which retries no query and no mutation', () => {
    const { result } = renderHook(() => useQueryClient(), {
      wrapper: ({ children }) => <AppProviders queryClient={queryClient}>{children}</AppProviders>,
    });

    expect(result.current).toBe(queryClient);
    expect(result.current.getDefaultOptions().queries?.retry).toBe(false);
    expect(result.current.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
