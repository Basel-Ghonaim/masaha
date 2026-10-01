import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Field } from '.';
import { Input } from '../Input';

describe('Field', () => {
  it('labels its control', async () => {
    render(
      <Field label="Email">
        <Input />
      </Field>,
    );

    await userEvent.click(screen.getByText('Email'));

    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus();
  });

  it('describes the control with its helper text', () => {
    render(
      <Field label="Email" helper="We only use it to sign you in">
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });

    expect(input).toHaveAccessibleDescription('We only use it to sign you in');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('marks the control invalid and reads the error before the helper', () => {
    render(
      <Field label="Email" helper="We only use it to sign you in" error="Enter a valid email">
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email We only use it to sign you in');
  });

  it('adds the descriptions the control is given to its own', () => {
    render(
      <>
        <p id="format">Like name@example.com</p>
        <Field label="Email" error="Enter a valid email">
          <Input aria-describedby="format" />
        </Field>
      </>,
    );

    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription(
      'Enter a valid email Like name@example.com',
    );
  });

  it('keeps its label on the control when the control is given an id', () => {
    render(
      <Field label="Email">
        <Input id="email" />
      </Field>,
    );

    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  it.each([
    { case: 'no helper or error', helper: undefined, error: undefined },
    { case: 'an error that does not apply yet', helper: '', error: false },
  ])('describes nothing and stays valid with $case', ({ helper, error }) => {
    render(
      <Field label="Email" helper={helper} error={error}>
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });

    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('shows an element at the end of the label row without adding it to the name', () => {
    render(
      <Field label="Password" labelEnd={<a href="/forgot-password">Forgot your password?</a>}>
        <Input type="password" />
      </Field>,
    );

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('link', { name: 'Forgot your password?' })).toBeInTheDocument();
  });

  it('shows the whole field disabled when its control is disabled', () => {
    const { rerender } = render(
      <Field label="Email" helper="Change it in your account settings">
        <Input disabled />
      </Field>,
    );
    const field = screen.getByText('Email').closest('[data-slot=field]');

    expect(field).toHaveAttribute('data-disabled');

    rerender(
      <Field label="Email" helper="Change it in your account settings">
        <Input />
      </Field>,
    );

    expect(field).not.toHaveAttribute('data-disabled');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <form>
        <Field label="Email" helper="We only use it to sign you in">
          <Input type="email" dir="ltr" />
        </Field>
        <Field label="Password" error="Enter your password">
          <Input type="password" />
        </Field>
      </form>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
