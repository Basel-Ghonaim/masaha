import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Avatar, AvatarFallback, AvatarImage } from '.';

describe('Avatar', () => {
  // jsdom never loads an image, so the picture stays in its loading state.
  it('shows the initials until the picture loads', () => {
    render(
      <Avatar>
        <AvatarImage src="/photos/sara.jpg" alt="Sara Helou" />
        <AvatarFallback>SH</AvatarFallback>
      </Avatar>,
    );

    expect(screen.getByText('SH')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Avatar size="sm">
          <AvatarFallback>SH</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarImage src="/photos/sara.jpg" alt="Sara Helou" />
          <AvatarFallback>SH</AvatarFallback>
        </Avatar>
        <Avatar size="lg" aria-hidden>
          <AvatarFallback>SH</AvatarFallback>
        </Avatar>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
