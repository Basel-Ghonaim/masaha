import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Separator } from '.';

describe('Separator', () => {
  it('is hidden from assistive technology while decorative', () => {
    render(<Separator />);

    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('is announced, with its orientation, when not decorative', () => {
    render(<Separator decorative={false} orientation="vertical" />);

    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <p>Members</p>
        <Separator />
        <p>Attendance</p>
        <Separator decorative={false} />
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
