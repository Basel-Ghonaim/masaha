import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ThemeToggle } from '.';

describe('ThemeToggle', () => {
  it.each([
    { theme: 'light' as const, label: 'Dark theme', next: 'dark' },
    { theme: 'dark' as const, label: 'Light theme', next: 'light' },
  ])('offers the $next theme from $theme, named by its label', async (state) => {
    const onThemeChange = vi.fn();
    render(<ThemeToggle theme={state.theme} onThemeChange={onThemeChange} label={state.label} />);
    const toggle = screen.getByRole('button', { name: state.label });

    await userEvent.click(toggle);

    expect(onThemeChange).toHaveBeenCalledExactlyOnceWith(state.next);
    expect(toggle).not.toHaveAttribute('aria-pressed');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ThemeToggle theme="dark" onThemeChange={vi.fn()} label="Light theme" />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
