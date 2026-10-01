import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RadioGroup, RadioGroupItem, type RadioGroupProps } from '.';
import { DirectionProvider } from '../../lib/DirectionProvider';
import { Field } from '../Field';

const PLANS = [
  { value: 'daily', label: 'Daily pass' },
  { value: 'weekly', label: 'Weekly pass' },
  { value: 'monthly', label: 'Monthly pass' },
];

function PlanField({ error, ...props }: RadioGroupProps & { error?: string }) {
  return (
    <Field label="Membership plan" helper="You can change it later" error={error}>
      <RadioGroup {...props}>
        {PLANS.map((plan) => (
          <Field key={plan.value} label={plan.label} orientation="horizontal">
            <RadioGroupItem value={plan.value} />
          </Field>
        ))}
      </RadioGroup>
    </Field>
  );
}

describe('RadioGroup', () => {
  it('is named and described by its Field, and each option by its own', () => {
    render(<PlanField error="Choose a plan" />);
    const group = screen.getByRole('radiogroup', { name: 'Membership plan' });

    expect(group).toHaveAccessibleDescription('Choose a plan You can change it later');
    expect(group).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radio', { name: 'Monthly pass' })).not.toHaveAttribute(
      'aria-describedby',
    );
  });

  it('chooses an option when its label is clicked', async () => {
    render(<PlanField />);

    await userEvent.click(screen.getByText('Weekly pass'));

    expect(screen.getByRole('radio', { name: 'Weekly pass' })).toBeChecked();
  });

  it.each([
    { dir: 'ltr' as const, key: 'ArrowRight' },
    { dir: 'rtl' as const, key: 'ArrowLeft' },
  ])('moves to the next option with $key in $dir', async ({ dir, key }) => {
    render(
      <DirectionProvider dir={dir}>
        <PlanField defaultValue="daily" />
      </DirectionProvider>,
    );
    const next = screen.getByRole('radio', { name: 'Weekly pass' });

    await userEvent.tab();
    // Held, as a real key press is: Radix moves the focus a tick later, and chooses the option it
    // lands on only while an arrow key is down.
    await userEvent.keyboard(`{${key}>}`);

    expect(next).toBeChecked();
    expect(next).toHaveFocus();
  });

  it('does not choose a disabled option', async () => {
    render(
      <RadioGroup aria-label="Membership plan">
        <RadioGroupItem value="daily" aria-label="Daily pass" />
        <RadioGroupItem value="weekly" aria-label="Weekly pass" disabled />
      </RadioGroup>,
    );
    const disabled = screen.getByRole('radio', { name: 'Weekly pass' });

    await userEvent.click(disabled);

    expect(disabled).not.toBeChecked();
  });

  it('shows its Field disabled and disables every option when the group is disabled', () => {
    render(<PlanField disabled />);

    expect(screen.getByText('Membership plan').closest('[data-slot=field]')).toHaveAttribute(
      'data-disabled',
    );
    for (const option of screen.getAllByRole('radio')) {
      expect(option).toBeDisabled();
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PlanField defaultValue="monthly" error="Choose a plan" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
