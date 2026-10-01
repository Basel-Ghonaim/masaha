import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Switch } from '.';
import { Field } from '../Field';

describe('Switch', () => {
  it('turns on and off when its label is clicked', async () => {
    render(
      <Field label="Check members out automatically" orientation="horizontal">
        <Switch />
      </Field>,
    );
    const toggle = screen.getByRole('switch', { name: 'Check members out automatically' });

    await userEvent.click(screen.getByText('Check members out automatically'));
    expect(toggle).toBeChecked();

    await userEvent.click(screen.getByText('Check members out automatically'));
    expect(toggle).not.toBeChecked();
  });

  it('turns on with the space key', async () => {
    render(<Switch aria-label="Dark theme" />);

    await userEvent.tab();
    await userEvent.keyboard(' ');

    expect(screen.getByRole('switch', { name: 'Dark theme' })).toBeChecked();
  });

  it('does not change while disabled', async () => {
    render(<Switch aria-label="Dark theme" disabled />);
    const toggle = screen.getByRole('switch', { name: 'Dark theme' });

    await userEvent.click(toggle);

    expect(toggle).not.toBeChecked();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Field
        label="Check members out automatically"
        helper="At closing time"
        orientation="horizontal"
      >
        <Switch defaultChecked />
      </Field>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
