import type { RouteObject } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { routeLoaders, warm } from './warmLazy';

/** A loader that settles a tick after it is called, and says whether it has. */
function slowLoader() {
  const loader = {
    settled: false,
    load: vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      loader.settled = true;
      return {};
    }),
  };
  return loader;
}

describe('warm', () => {
  it('awaits every loader once', async () => {
    const shell = slowLoader();
    const page = slowLoader();

    await warm(shell.load, page.load);

    expect(shell.load).toHaveBeenCalledTimes(1);
    expect(page.load).toHaveBeenCalledTimes(1);
    expect([shell.settled, page.settled]).toEqual([true, true]);
  });

  it('fails when a loader fails, so a broken import is not hidden', async () => {
    await expect(warm(() => Promise.reject(new Error('no module')))).rejects.toThrow('no module');
  });
});

describe('routeLoaders', () => {
  it("gives the lazy loaders of the routes a location matches, in the tree's order", async () => {
    const order: string[] = [];
    const lazyOf = (name: string) =>
      vi.fn(() => {
        order.push(name);
        return Promise.resolve({});
      });
    const shell = lazyOf('shell');
    const home = lazyOf('home');
    const about = lazyOf('about');
    const routes: RouteObject[] = [
      {
        lazy: shell,
        children: [
          { index: true, lazy: home },
          { path: 'about', lazy: about },
        ],
      },
    ];

    await warm(...routeLoaders(routes, '/'));

    expect(order).toEqual(['shell', 'home']);
    expect(about).not.toHaveBeenCalled();
  });

  it('gives each loader of a lazy route written as an object', async () => {
    const Component = vi.fn(() => Promise.resolve(() => null));
    const loader = vi.fn(() => Promise.resolve(() => null));

    await warm(...routeLoaders([{ path: '/', lazy: { Component, loader } }], '/'));

    expect(Component).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('gives nothing for a location no route matches', () => {
    expect(
      routeLoaders([{ path: '/', lazy: vi.fn(() => Promise.resolve({})) }], '/nowhere'),
    ).toEqual([]);
  });
});
