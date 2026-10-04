import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PasswordRulesView } from '../types/PasswordRulesView';
import { PasswordRules } from './PasswordRules';

const VIEW: PasswordRulesView = {
  label: 'Password rules',
  rules: [
    { rule: 'minLength', text: 'At least 8 characters', state: 'failed', status: '— not met yet' },
    { rule: 'letter', text: 'At least one letter', state: 'met', status: '— met' },
    { rule: 'digit', text: 'At least one number', state: 'pending', status: '— not met yet' },
  ],
};

describe('PasswordRules', () => {
  it('renders a named list with each rule and its state as read aloud', () => {
    render(<PasswordRules view={VIEW} />);

    const items = within(screen.getByRole('list', { name: 'Password rules' })).getAllByRole(
      'listitem',
    );
    expect(items.map((item) => item.textContent)).toEqual([
      'At least 8 characters — not met yet',
      'At least one letter — met',
      'At least one number — not met yet',
    ]);
  });

  it('carries the id the password field is described by', () => {
    render(<PasswordRules view={VIEW} id="rules" />);

    expect(screen.getByRole('list')).toHaveAttribute('id', 'rules');
  });
});
