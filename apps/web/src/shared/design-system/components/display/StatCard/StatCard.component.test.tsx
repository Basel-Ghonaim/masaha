import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { StatCard } from '.';

describe('StatCard', () => {
  it('pairs its label with its value as a term and its definition', () => {
    render(<StatCard label="Present now" value="7" helper="of 40 seats" />);

    expect(screen.getByRole('term')).toHaveTextContent('Present now');
    expect(screen.getAllByRole('definition').map((item) => item.textContent)).toEqual([
      '7',
      'of 40 seats',
    ]);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <StatCard label="Present now" value="7" helper="of 40 seats" icon={<svg />} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
