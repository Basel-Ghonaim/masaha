import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Spinner } from '.';

describe('Spinner', () => {
  it('is a status named by its label', () => {
    render(<Spinner label="Loading members" />);

    expect(screen.getByRole('status', { name: 'Loading members' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Spinner label="Loading members" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
