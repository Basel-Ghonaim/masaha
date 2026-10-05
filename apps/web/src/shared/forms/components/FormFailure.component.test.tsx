import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FormFailure } from './FormFailure';

describe('FormFailure', () => {
  it('renders too many attempts as a warning, announced politely', () => {
    render(<FormFailure view={{ kind: 'rateLimit', message: 'Try again in 1:30.' }} />);

    expect(screen.getByRole('status')).toHaveTextContent('Try again in 1:30.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders no connection as an alert whose button sends the form again', async () => {
    const retry = vi.fn();
    render(
      <FormFailure
        view={{
          kind: 'offline',
          title: 'Couldn’t connect',
          message: 'Check your connection.',
          retryLabel: 'Try again',
          retry,
        }}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t connect');
    expect(alert).toHaveTextContent('Check your connection.');
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('renders a refusal as an alert with its title, its message and its reference', () => {
    render(
      <FormFailure
        view={{
          kind: 'refused',
          title: 'Couldn’t sign in',
          message: 'Something went wrong.',
          reference: 'Reference: req-1',
        }}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t sign in');
    expect(alert).toHaveTextContent('Something went wrong.');
    expect(alert).toHaveTextContent('Reference: req-1');
  });

  it('renders a refusal without a reference when it has none', () => {
    render(
      <FormFailure
        view={{ kind: 'refused', title: 'Couldn’t sign in', message: 'Wrong password.' }}
      />,
    );

    expect(screen.getByRole('alert')).not.toHaveTextContent('Reference');
  });
});
