import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '.';
import { Button } from '../Button';
import { Input } from '../Input';

function RenameSpace({ closeLabel }: { closeLabel?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Rename space</Button>
      </DialogTrigger>
      <DialogContent closeLabel={closeLabel}>
        <DialogHeader>
          <DialogTitle>Rename the space</DialogTitle>
          <DialogDescription>The new name shows in the directory at once.</DialogDescription>
        </DialogHeader>
        <Input aria-label="Space name" />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('opens as a named, described dialog and moves the focus into it', async () => {
    render(<RenameSpace />);

    await userEvent.click(screen.getByRole('button', { name: 'Rename space' }));

    const dialog = screen.getByRole('dialog', { name: 'Rename the space' });
    expect(dialog).toHaveAccessibleDescription('The new name shows in the directory at once.');
    expect(screen.getByRole('textbox', { name: 'Space name' })).toHaveFocus();
  });

  it('keeps the focus inside while open', async () => {
    render(<RenameSpace closeLabel="Close" />);
    await userEvent.click(screen.getByRole('button', { name: 'Rename space' }));

    // Space name → Cancel → Save → Close, then round to the start again.
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('textbox', { name: 'Space name' })).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it.each([
    { how: 'Escape', close: () => userEvent.keyboard('{Escape}') },
    {
      how: 'its close button',
      close: () => userEvent.click(screen.getByRole('button', { name: 'Close' })),
    },
    {
      how: 'a close action',
      close: () => userEvent.click(screen.getByRole('button', { name: 'Cancel' })),
    },
  ])('closes with $how and returns the focus to its trigger', async ({ close }) => {
    render(<RenameSpace closeLabel="Close" />);
    const trigger = screen.getByRole('button', { name: 'Rename space' });
    await userEvent.click(trigger);

    await close();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on a click outside it', async () => {
    render(<RenameSpace />);
    await userEvent.click(screen.getByRole('button', { name: 'Rename space' }));

    // A modal makes the rest of the page ignore the pointer; the press still reaches the document,
    // where an outside click is detected.
    await userEvent
      .setup({ pointerEventsCheck: PointerEventsCheckLevel.Never })
      .click(document.body);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has no close button in the corner without a label for it', async () => {
    render(<RenameSpace />);

    await userEvent.click(screen.getByRole('button', { name: 'Rename space' }));

    // Cancel and Save are the footer's; nothing else is a button inside the dialog.
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Cancel',
      'Save',
    ]);
  });

  it('has no accessibility violations while open', async () => {
    render(<RenameSpace closeLabel="Close" />);
    await userEvent.click(screen.getByRole('button', { name: 'Rename space' }));

    // The dialog is portalled to <body>, so the whole body is checked. Landmarks belong to a
    // page, not to a component, so that rule is off.
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
