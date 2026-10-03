import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { bootstrap } from './bootstrap';

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
  bootstrap();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders the main landmark', async () => {
    render(<App />);

    // The page loads lazily, so the landmark arrives once its code has.
    expect(await screen.findByRole('main')).toBeInTheDocument();
  });
});
