import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Checkbox } from '.';
import { Field } from '../Field';

describe('Checkbox', () => {
  it('toggles when its label is clicked', async () => {
    render(
      <Field label="Verified spaces only" orientation="horizontal">
        <Checkbox />
      </Field>,
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Verified spaces only' });

    await userEvent.click(screen.getByText('Verified spaces only'));

    expect(checkbox).toBeChecked();
  });

  it('toggles with the space key', async () => {
    render(<Checkbox aria-label="Available now" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Available now' });

    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(checkbox).toBeChecked();

    await userEvent.keyboard(' ');
    expect(checkbox).not.toBeChecked();
  });

  it('does not toggle while disabled', async () => {
    render(<Checkbox aria-label="Available now" disabled />);
    const checkbox = screen.getByRole('checkbox', { name: 'Available now' });

    await userEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it('takes its description and error from a Field', () => {
    render(
      <Field label="I agree to the terms" error="Agree to continue" orientation="horizontal">
        <Checkbox />
      </Field>,
    );
    const checkbox = screen.getByRole('checkbox', { name: 'I agree to the terms' });

    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    expect(checkbox).toHaveAccessibleDescription('Agree to continue');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Field label="Verified spaces only" orientation="horizontal">
          <Checkbox defaultChecked />
        </Field>
        <Field label="Available now" helper="Spaces with a free seat" orientation="horizontal">
          <Checkbox />
        </Field>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
