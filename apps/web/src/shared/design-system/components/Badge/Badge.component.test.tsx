import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Badge } from '.';

describe('Badge', () => {
  it('shows its word, which carries the status without the colour', () => {
    render(<Badge variant="destructive">Expired</Badge>);

    expect(screen.getByText('Expired')).toBeVisible();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Badge>Rejected</Badge>
        <Badge variant="primary">Owner</Badge>
        <Badge variant="success">Active</Badge>
        <Badge variant="warning">Ends in 3 days</Badge>
        <Badge variant="info">New</Badge>
        <Badge variant="destructive">Expired</Badge>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
