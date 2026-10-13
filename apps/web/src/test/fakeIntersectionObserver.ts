import { vi } from 'vitest';

/**
 * Stands in for the browser's IntersectionObserver, which jsdom lacks: each observer is kept, and
 * `intersect` tells every one of them which observed elements now cross its area. The test file
 * restores the global with `vi.unstubAllGlobals()`.
 */
export function fakeIntersectionObserver() {
  const observers: { callback: IntersectionObserverCallback; elements: Element[] }[] = [];

  class FakeObserver {
    private readonly entry: (typeof observers)[number];

    constructor(callback: IntersectionObserverCallback) {
      this.entry = { callback, elements: [] };
      observers.push(this.entry);
    }

    observe(element: Element) {
      this.entry.elements.push(element);
    }

    unobserve(element: Element) {
      this.entry.elements = this.entry.elements.filter((observed) => observed !== element);
    }

    disconnect() {
      this.entry.elements = [];
    }

    takeRecords() {
      return [];
    }
  }

  vi.stubGlobal('IntersectionObserver', FakeObserver);

  return {
    /**
     * Says that the elements with these ids cross the area, and the others observed do not. As a
     * browser does, an observer hears nothing of an element no longer in the page.
     */
    intersect(ids: string[]) {
      for (const { callback, elements } of observers) {
        const entries = elements
          .filter((target) => target.isConnected)
          .map(
            (target) =>
              ({ target, isIntersecting: ids.includes(target.id) }) as IntersectionObserverEntry,
          );
        callback(entries, {} as IntersectionObserver);
      }
    },
  };
}
