import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { documentLanguage, setupLocalisation, useCatalogue, useLanguage } from '.';

type Words = { greeting: string };

const CATALOGUES: Record<string, Words> = {
  ar: { greeting: 'مرحبًا' },
  en: { greeting: 'Hello' },
};

function Greeting() {
  const language = useLanguage();
  return <p lang={language}>{(useCatalogue() as Words).greeting}</p>;
}

beforeEach(() => {
  setupLocalisation({ catalogues: CATALOGUES, language: documentLanguage });
});

afterEach(() => {
  document.documentElement.lang = '';
});

describe('the active catalogue in a component', () => {
  it('is the one registered for the language on <html>', () => {
    document.documentElement.lang = 'en';

    render(<Greeting />);

    expect(screen.getByText('Hello')).toHaveAttribute('lang', 'en');
  });

  it('is read again, and rendered again, when <html> changes language', async () => {
    document.documentElement.lang = 'en';
    render(<Greeting />);

    document.documentElement.lang = 'ar';

    expect(await screen.findByText('مرحبًا')).toHaveAttribute('lang', 'ar');
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });
});
