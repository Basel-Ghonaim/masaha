import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { setupLocalisation, useCatalogue, useLanguage, type LanguageSource } from '.';

type Words = { greeting: string };

const CATALOGUES: Record<string, Words> = {
  ar: { greeting: 'مرحبًا' },
  en: { greeting: 'Hello' },
};

function Greeting() {
  const language = useLanguage();
  return <p lang={language}>{(useCatalogue() as Words).greeting}</p>;
}

/** A source that names whatever language the test sets, and tells its listeners. */
function sourceNaming(initial: string) {
  let language = initial;
  const listeners = new Set<() => void>();
  const source: LanguageSource = {
    current: () => language,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return {
    source,
    set: (next: string) => {
      language = next;
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
}

let language: ReturnType<typeof sourceNaming>;

beforeEach(() => {
  language = sourceNaming('en');
  setupLocalisation({ catalogues: CATALOGUES, language: language.source });
});

describe('the active catalogue in a component', () => {
  it("is the one registered for the source's language", () => {
    render(<Greeting />);

    expect(screen.getByText('Hello')).toHaveAttribute('lang', 'en');
  });

  it('is read again, and rendered again, when the source changes language', () => {
    render(<Greeting />);

    act(() => {
      language.set('ar');
    });

    expect(screen.getByText('مرحبًا')).toHaveAttribute('lang', 'ar');
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });
});
