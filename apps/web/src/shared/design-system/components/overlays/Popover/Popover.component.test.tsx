import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Popover, PopoverContent, PopoverTrigger } from '.';

function OpeningHours() {
  return (
    <>
      <Popover>
        <PopoverTrigger>Opening hours</PopoverTrigger>
        <PopoverContent aria-label="Opening hours of the space">
          <p>Open from eight until eight</p>
          <button type="button">Copy the hours</button>
        </PopoverContent>
      </Popover>
      <button type="button">Elsewhere on the page</button>
    </>
  );
}

describe('Popover', () => {
  it('opens a named panel on the dropdown layer, with the focus inside', async () => {
    render(<OpeningHours />);

    await userEvent.click(screen.getByRole('button', { name: 'Opening hours' }));
    const panel = screen.getByRole('dialog', { name: 'Opening hours of the space' });

    expect(panel).toHaveClass('z-(--z-dropdown)');
    expect(screen.getByRole('button', { name: 'Copy the hours' })).toHaveFocus();
  });

  it('closes with Escape and returns the focus to its trigger', async () => {
    render(<OpeningHours />);
    const trigger = screen.getByRole('button', { name: 'Opening hours' });

    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on a click outside', async () => {
    render(<OpeningHours />);

    await userEvent.click(screen.getByRole('button', { name: 'Opening hours' }));
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere on the page' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has no accessibility violations when open', async () => {
    render(<OpeningHours />);

    await userEvent.click(screen.getByRole('button', { name: 'Opening hours' }));

    // The panel is portalled to <body>, so the whole body is checked. Landmarks belong to a page,
    // not to a component, so that rule is off.
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
