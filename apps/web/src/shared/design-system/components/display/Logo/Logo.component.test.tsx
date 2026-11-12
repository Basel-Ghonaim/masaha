import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { DirectionProvider } from '../../../lib/DirectionProvider';
import { Logo } from '.';

const FORMS = ['full', 'mark'] as const;

/** The colour classes of the logo's drawing, each path's in document order. */
function fills(svg: Element): string[] {
  return Array.from(svg.querySelectorAll('path'), (path) => path.getAttribute('class') ?? '');
}

describe('Logo', () => {
  it.each(['مساحة', 'Masaha'])('is an image named %s by its label', (label) => {
    render(<Logo label={label} />);

    expect(screen.getByRole('img', { name: label })).toBeInTheDocument();
  });

  it.each(FORMS)('is hidden from assistive technology without a label (%s)', (form) => {
    const { container } = render(<Logo form={form} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws the full logo in its frame: the words in the ink, the dots in the spark', () => {
    const { container } = render(<Logo label="Masaha" />);
    const svg = screen.getByRole('img', { name: 'Masaha' });

    expect(svg).toHaveAttribute('viewBox', '263 45 2473 903');
    expect(fills(svg)).toEqual(['fill-foreground', 'fill-spark']);
    expect(container.querySelectorAll('svg svg')).toHaveLength(0);
  });

  it('draws the mark in its square frame: the ة twice in the ink, the dots in the spark', () => {
    render(<Logo form="mark" label="Masaha" />);
    const svg = screen.getByRole('img', { name: 'Masaha' });

    expect(svg).toHaveAttribute('viewBox', '190 17 778 778');
    expect(fills(svg)).toEqual(['fill-foreground', 'fill-foreground', 'fill-spark']);
  });

  it.each(FORMS)('is never mirrored: the same drawing in both directions (%s)', (form) => {
    const drawn = (['rtl', 'ltr'] as const).map((dir) => {
      const { container, unmount } = render(
        <DirectionProvider dir={dir}>
          <div dir={dir}>
            <Logo form={form} label="Masaha" />
          </div>
        </DirectionProvider>,
      );
      const markup = container.querySelector('svg')?.outerHTML ?? '';
      unmount();
      return markup;
    });

    expect(drawn[0]).toBe(drawn[1]);
    expect(drawn[0]).not.toMatch(/\b(rtl|ltr):|scale-x|rotate-/);
  });

  it('takes its size from the caller and keeps its proportions', () => {
    render(<Logo label="Masaha" className="h-10" />);

    expect(screen.getByRole('img', { name: 'Masaha' })).toHaveClass(
      'h-10',
      'w-auto',
      'aspect-[2473/903]',
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <a href="/">
          <Logo label="Masaha" className="h-10" />
        </a>
        <p>
          <Logo form="mark" className="size-9" /> Masaha
        </p>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
