import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Tooltip, TooltipContent, TooltipTrigger } from '.';

function CopyLink() {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger>Copy link</TooltipTrigger>
      <TooltipContent>Copies the space's public page address</TooltipContent>
    </Tooltip>
  );
}

describe('Tooltip', () => {
  it('opens when its trigger is focused, and describes it', async () => {
    render(<CopyLink />);

    await userEvent.tab();

    const hint = await screen.findByRole('tooltip');
    expect(hint).toHaveTextContent("Copies the space's public page address");
    expect(screen.getByRole('button', { name: 'Copy link' })).toHaveAccessibleDescription(
      "Copies the space's public page address",
    );
  });

  it('opens when its trigger is hovered', async () => {
    render(<CopyLink />);

    await userEvent.hover(screen.getByRole('button', { name: 'Copy link' }));

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('closes with Escape', async () => {
    render(<CopyLink />);
    await userEvent.tab();
    await screen.findByRole('tooltip');

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('has no accessibility violations while open', async () => {
    render(<CopyLink />);
    await userEvent.tab();
    await screen.findByRole('tooltip');

    // The hint is portalled to <body>, so the whole body is checked. Landmarks belong to a page,
    // not to a component, so that rule is off.
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
