import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Textarea } from '.';
import { Field } from '../Field';

describe('Textarea', () => {
  it('takes its label, description and error from a Field', () => {
    render(
      <Field label="Details" helper="What is wrong in the listing" error="Describe the problem">
        <Textarea />
      </Field>,
    );
    const textarea = screen.getByRole('textbox', { name: 'Details' });

    expect(textarea).toHaveAccessibleDescription(
      'Describe the problem What is wrong in the listing',
    );
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('accepts no typing while disabled', async () => {
    render(<Textarea aria-label="Details" disabled />);
    const textarea = screen.getByRole('textbox', { name: 'Details' });

    await userEvent.type(textarea, 'The hours are wrong');

    expect(textarea).toHaveValue('');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Field label="Details" helper="What is wrong in the listing">
        <Textarea />
      </Field>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
