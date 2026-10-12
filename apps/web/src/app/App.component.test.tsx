import type { QueryClient } from '@shared/api';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { blockLocalStorage } from '../test/fakeStorage';
import { App } from './App';
import { bootstrap } from './bootstrap';

let queryClient: QueryClient;

beforeAll(() => {
  // jsdom has no media queries, and the preferences ask the device's colour scheme.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  // Nor does it scroll, and the root restores the scroll position.
  vi.stubGlobal('scrollTo', () => undefined);
  ({ queryClient } = bootstrap());
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders the main landmark', async () => {
    render(<App queryClient={queryClient} />);

    // The page loads lazily, so the landmark arrives once its code has.
    expect(await screen.findByRole('main')).toBeInTheDocument();
  });

  it('starts, and still changes its language and theme, in a browser that blocks storage', async () => {
    blockLocalStorage();
    ({ queryClient } = bootstrap());
    const user = userEvent.setup();
    render(<App queryClient={queryClient} />);

    await user.click(await screen.findByRole('button', { name: 'English' }));
    await user.click(screen.getByRole('button', { name: 'Dark theme' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'en');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    // The tab names the page in the language just chosen.
    expect(document.title).toBe('Home · Masaha');
  });
});
