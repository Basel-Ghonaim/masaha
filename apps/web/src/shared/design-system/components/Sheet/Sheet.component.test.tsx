import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetContentProps,
} from '.';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';

function FilterPanel({
  side = 'bottom',
  closeLabel,
}: Pick<SheetContentProps, 'side' | 'closeLabel'>) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Filters</Button>
      </SheetTrigger>
      <SheetContent side={side} closeLabel={closeLabel}>
        <SheetHeader>
          <SheetTitle>Filter the reports</SheetTitle>
          <SheetDescription>Only matching reports are listed.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Checkbox aria-label="New" />
          <Checkbox aria-label="In review" />
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button>Show 20 reports</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

describe('Sheet', () => {
  it('opens as a named, described dialog and moves the focus into it', async () => {
    render(<FilterPanel />);

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));

    const sheet = screen.getByRole('dialog', { name: 'Filter the reports' });
    expect(sheet).toHaveAccessibleDescription('Only matching reports are listed.');
    expect(screen.getByRole('checkbox', { name: 'New' })).toHaveFocus();
  });

  it.each(['start', 'end', 'bottom'] as const)(
    'keeps the focus inside while open from the %s side',
    async (side) => {
      render(<FilterPanel side={side} closeLabel="Close the filters" />);
      await userEvent.click(screen.getByRole('button', { name: 'Filters' }));

      // New → In review → Show 20 reports → Close, then round to the start again.
      await userEvent.tab();
      await userEvent.tab();
      await userEvent.tab();
      expect(screen.getByRole('button', { name: 'Close the filters' })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('checkbox', { name: 'New' })).toHaveFocus();
    },
  );

  it.each([
    { how: 'Escape', close: () => userEvent.keyboard('{Escape}') },
    {
      how: 'its close button',
      close: () => userEvent.click(screen.getByRole('button', { name: 'Close the filters' })),
    },
    {
      how: 'its footer action',
      close: () => userEvent.click(screen.getByRole('button', { name: 'Show 20 reports' })),
    },
  ])('closes with $how and returns the focus to its trigger', async ({ close }) => {
    render(<FilterPanel closeLabel="Close the filters" />);
    const trigger = screen.getByRole('button', { name: 'Filters' });
    await userEvent.click(trigger);

    await close();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('has no close button in the corner without a label for it', async () => {
    render(<FilterPanel />);

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Show 20 reports',
    ]);
  });

  it('has no accessibility violations while open', async () => {
    render(<FilterPanel closeLabel="Close the filters" />);
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));

    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
