import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '.';
import { EllipsisIcon } from '../../../icons';
import { Button } from '../Button';
import { DirectionProvider } from '../../../lib/DirectionProvider';

function RowActions({ onView = () => undefined }: { onView?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Actions for Sara Helou">
          <EllipsisIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Report</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onView}>View details</DropdownMenuItem>
        <DropdownMenuItem disabled>Open the space page</DropdownMenuItem>
        <DropdownMenuCheckboxItem>Follow the report</DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Mark as</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Corrected</DropdownMenuItem>
            <DropdownMenuItem>In review</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Reject the report</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('DropdownMenu', () => {
  it('opens from the keyboard with the focus on its first item', async () => {
    render(<RowActions />);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'View details' })).toHaveFocus();
  });

  it('moves with the arrow keys, skipping a disabled item', async () => {
    render(<RowActions />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Sara Helou' }));

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');

    expect(screen.getByRole('menuitemcheckbox', { name: 'Follow the report' })).toHaveFocus();
  });

  it('keeps the focus inside while open', async () => {
    render(<RowActions />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Sara Helou' }));
    await userEvent.keyboard('{ArrowDown}');

    await userEvent.tab();

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menu')).toContainElement(document.activeElement as HTMLElement);
  });

  it('runs an item, closes and returns the focus to its trigger', async () => {
    const onView = vi.fn();
    render(<RowActions onView={onView} />);
    const trigger = screen.getByRole('button', { name: 'Actions for Sara Helou' });
    await userEvent.click(trigger);

    await userEvent.click(screen.getByRole('menuitem', { name: 'View details' }));

    expect(onView).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes with Escape and returns the focus to its trigger', async () => {
    render(<RowActions />);
    const trigger = screen.getByRole('button', { name: 'Actions for Sara Helou' });
    await userEvent.click(trigger);

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('reports the state of a checkbox item and asks to change it', async () => {
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Columns</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked onCheckedChange={onCheckedChange}>
            Phone number
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const item = screen.getByRole('menuitemcheckbox', { name: 'Phone number' });
    expect(item).toBeChecked();

    await userEvent.click(item);

    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it.each([
    { dir: 'ltr' as const, open: 'ArrowRight', close: 'ArrowLeft' },
    { dir: 'rtl' as const, open: 'ArrowLeft', close: 'ArrowRight' },
  ])(
    'opens a submenu with $open and closes it with $close in $dir',
    async ({ dir, open, close }) => {
      render(
        <DirectionProvider dir={dir}>
          <RowActions />
        </DirectionProvider>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Actions for Sara Helou' }));
      const subTrigger = screen.getByRole('menuitem', { name: 'Mark as' });
      subTrigger.focus();

      await userEvent.keyboard(`{${open}}`);
      expect(await screen.findByRole('menuitem', { name: 'Corrected' })).toHaveFocus();

      await userEvent.keyboard(`{${close}}`);
      expect(screen.queryByRole('menuitem', { name: 'Corrected' })).not.toBeInTheDocument();
      expect(subTrigger).toHaveFocus();
    },
  );

  it('has no accessibility violations while open', async () => {
    render(<RowActions />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Sara Helou' }));

    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
