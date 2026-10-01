import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { EmptyState } from '.';

describe('EmptyState', () => {
  it('titles itself with a heading at the level given', () => {
    render(<EmptyState title="No members named Khaled" titleAs="h3" />);

    expect(
      screen.getByRole('heading', { level: 3, name: 'No members named Khaled' }),
    ).toBeInTheDocument();
  });

  it('has a second-level heading by default', () => {
    render(<EmptyState title="No favourites yet" />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('No favourites yet');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <EmptyState
        icon={<svg />}
        title="No members named Khaled"
        description="Check the spelling, or search by phone number."
      >
        <button type="button">Clear the search</button>
        <button type="button">Add a member</button>
      </EmptyState>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
