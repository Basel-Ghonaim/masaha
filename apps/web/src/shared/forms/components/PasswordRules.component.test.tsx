import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordRules } from './PasswordRules';

describe('PasswordRules', () => {
  it.each([
    ['needs', 'text-muted-foreground'],
    ['missing', 'text-muted-foreground'],
    ['met', 'text-foreground'],
    ['failed', 'text-destructive'],
  ] as const)('renders the line in the tone of its state (%s)', (state, tone) => {
    render(<PasswordRules view={{ state, line: 'The line' }} />);

    expect(screen.getByText('The line')).toHaveClass(tone);
  });

  it('marks a password that meets the condition with a tick, hidden from assistive technology', () => {
    const { container } = render(
      <PasswordRules view={{ state: 'met', line: 'The password is fine' }} />,
    );

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('The password is fine').textContent).toBe('The password is fine');
  });

  it('shows no tick before the condition is met', () => {
    const { container } = render(<PasswordRules view={{ state: 'missing', line: 'Needs more' }} />);

    expect(container.querySelector('svg')).toBeNull();
  });

  it('carries the id the password field is described by', () => {
    render(<PasswordRules view={{ state: 'needs', line: 'The line' }} id="rules" />);

    expect(screen.getByText('The line')).toHaveAttribute('id', 'rules');
  });
});
