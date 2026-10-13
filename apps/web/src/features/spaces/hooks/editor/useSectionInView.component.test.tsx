import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeIntersectionObserver } from '../../../../test/fakeIntersectionObserver';
import { useSectionInView } from './useSectionInView';

const IDS = ['profile', 'amenities', 'contacts'];

/** The sections, drawn in the page with their ids. */
function drawSections() {
  for (const id of IDS) {
    const section = document.createElement('section');
    section.id = id;
    document.body.append(section);
  }
}

let observer: ReturnType<typeof fakeIntersectionObserver>;

beforeEach(() => {
  observer = fakeIntersectionObserver();
  drawSections();
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useSectionInView', () => {
  it('is the first section until one crosses the band, then the first that does', () => {
    const { result } = renderHook(() => useSectionInView(IDS, 'edit'));
    expect(result.current.current).toBe('profile');

    act(() => {
      observer.intersect(['amenities', 'contacts']);
    });

    expect(result.current.current).toBe('amenities');
  });

  it('marks a section chosen at once, and holds it while the scroll it starts settles', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { result } = renderHook(() => useSectionInView(IDS, 'edit'));

    act(() => {
      result.current.choose('contacts');
    });
    expect(result.current.current).toBe('contacts');
    act(() => {
      observer.intersect(['amenities']);
    });
    expect(result.current.current).toBe('contacts');

    vi.advanceTimersByTime(1000);
    act(() => {
      observer.intersect(['amenities']);
    });
    expect(result.current.current).toBe('amenities');
  });

  it('follows the sections drawn anew under the same ids, as a page turned read-only draws them', () => {
    const { result, rerender } = renderHook(({ drawn }) => useSectionInView(IDS, drawn), {
      initialProps: { drawn: 'edit' },
    });
    document.body.replaceChildren();
    drawSections();

    rerender({ drawn: 'read' });
    act(() => {
      observer.intersect(['contacts']);
    });

    expect(result.current.current).toBe('contacts');
  });
});
