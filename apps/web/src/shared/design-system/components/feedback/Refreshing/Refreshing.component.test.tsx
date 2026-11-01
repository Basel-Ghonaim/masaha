import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Refreshing } from '.';

function Cards({ refreshing }: { refreshing: boolean }) {
  return (
    <Refreshing refreshing={refreshing}>
      <ul aria-label="Spaces">
        <li>Focus Hub</li>
        <li>Palm Hub</li>
      </ul>
    </Refreshing>
  );
}

function wrapperOf(container: HTMLElement) {
  return container.querySelector('[data-slot="refreshing"]');
}

describe('Refreshing', () => {
  it('marks its list busy and dimmed while it refreshes, the cards kept', () => {
    const { container, rerender } = render(<Cards refreshing />);

    expect(wrapperOf(container)).toHaveAttribute('aria-busy', 'true');
    expect(wrapperOf(container)).toHaveAttribute('data-refreshing');
    expect(wrapperOf(container)).toHaveClass('data-refreshing:opacity-(--refreshing)');
    expect(screen.getByText('Focus Hub')).toBeVisible();

    rerender(<Cards refreshing={false} />);
    expect(wrapperOf(container)).not.toHaveAttribute('aria-busy');
    expect(wrapperOf(container)).not.toHaveAttribute('data-refreshing');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Cards refreshing />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
