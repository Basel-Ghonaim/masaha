import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Input, InputAction } from '.';
import { CircleAlertIcon, SearchIcon, XIcon } from '../../icons';
import { Field } from '../Field';

describe('Input', () => {
  it('takes its label, description and error from a Field', () => {
    render(
      <Field label="Phone" helper="Include the country code" error="Enter a phone number">
        <Input type="tel" />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Phone' });

    expect(input).toHaveAccessibleDescription('Enter a phone number Include the country code');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps a left-to-right value left to right', () => {
    render(<Input aria-label="Email" dir="ltr" />);

    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('dir', 'ltr');
  });

  it('accepts no typing while disabled', async () => {
    render(<Input aria-label="Name" disabled />);
    const input = screen.getByRole('textbox', { name: 'Name' });

    await userEvent.type(input, 'Basel');

    expect(input).toHaveValue('');
  });

  it('hides its icons from assistive technology', () => {
    render(
      <Input
        aria-label="Search"
        startIcon={<SearchIcon data-testid="start" />}
        endIcon={<CircleAlertIcon data-testid="end" />}
      />,
    );

    expect(screen.getByTestId('start').closest('[aria-hidden=true]')).not.toBeNull();
    expect(screen.getByTestId('end').closest('[aria-hidden=true]')).not.toBeNull();
  });

  it('names its action by the label it is given', async () => {
    const onClick = vi.fn();
    render(
      <Input
        aria-label="Search"
        action={<InputAction label="Clear the search" icon={<XIcon />} onClick={onClick} />}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Clear the search' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Field label="Email" helper="We only use it to sign you in" error="Enter a valid email">
          <Input
            type="email"
            dir="ltr"
            placeholder="name@example.com"
            endIcon={<CircleAlertIcon />}
          />
        </Field>
        <Field label="Search members">
          <Input
            startIcon={<SearchIcon />}
            action={<InputAction label="Clear the search" icon={<XIcon />} />}
          />
        </Field>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
