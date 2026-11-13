import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Button } from '.';

describe('Button', () => {
  it('runs its action when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('ignores clicks while disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('is busy and disabled while loading, and keeps its name', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });

    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders its child in place of a button', () => {
    render(
      <Button asChild variant="outline">
        <a href="/spaces">Browse spaces</a>
      </Button>,
    );

    expect(screen.getByRole('link', { name: 'Browse spaces' })).toHaveAttribute('href', '/spaces');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('underlines the link variant at rest, not only under the pointer', () => {
    render(<Button variant="link">Details</Button>);
    const link = screen.getByRole('button', { name: 'Details' });

    expect(link).toHaveClass('underline');
    expect(link).not.toHaveClass('hover:underline');
  });

  it.each(['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const)(
    'draws the %s variant without the spark, which never marks an action',
    (variant) => {
      render(<Button variant={variant}>Save</Button>);

      expect(screen.getByRole('button', { name: 'Save' }).className).not.toMatch(/spark/);
    },
  );

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Button>Save</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="outline">Export</Button>
        <Button variant="ghost">More</Button>
        <Button variant="destructive">Delete</Button>
        <Button variant="link">Details</Button>
        <Button loading>Saving</Button>
        <Button size="icon" aria-label="Search" />
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
