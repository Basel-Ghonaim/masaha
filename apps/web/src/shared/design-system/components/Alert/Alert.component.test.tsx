import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '.';

describe('Alert', () => {
  it('interrupts assistive technology when destructive', () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>The space could not be saved</AlertTitle>
      </Alert>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('The space could not be saved');
  });

  it('is announced politely when informative or a warning', () => {
    render(
      <>
        <Alert>
          <AlertTitle>Prices are shown for reference</AlertTitle>
        </Alert>
        <Alert variant="warning">
          <AlertTitle>Opening hours may be outdated</AlertTitle>
        </Alert>
      </>,
    );

    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('takes a role in place of its own', () => {
    render(
      <Alert variant="destructive" role="note">
        <AlertTitle>This space is hidden</AlertTitle>
      </Alert>,
    );

    expect(screen.getByRole('note')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows its variant icon, a given one, or none', () => {
    const { container, rerender } = render(<Alert variant="warning">Outdated</Alert>);
    expect(container.querySelectorAll('svg')).toHaveLength(1);

    rerender(
      <Alert variant="warning" icon={<svg data-testid="own-icon" aria-hidden />}>
        Outdated
      </Alert>,
    );
    expect(screen.getByTestId('own-icon')).toBeInTheDocument();
    expect(container.querySelectorAll('svg')).toHaveLength(1);

    rerender(
      <Alert variant="warning" icon={null}>
        Outdated
      </Alert>,
    );
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Alert>
          <AlertTitle>Prices are shown for reference</AlertTitle>
          <AlertDescription>Confirm them with the space before you visit.</AlertDescription>
        </Alert>
        <Alert variant="warning">
          <AlertTitle>Opening hours may be outdated</AlertTitle>
          <AlertAction>
            <a href="#report">Report wrong info</a>
          </AlertAction>
        </Alert>
        <Alert variant="destructive">
          <AlertTitle>The space could not be saved</AlertTitle>
          <AlertDescription>Check your connection and try again.</AlertDescription>
        </Alert>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
