import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '.';
import { Button } from '../../actions/Button';

function DeactivateMember({ onConfirm = () => undefined }: { onConfirm?: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Deactivate</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate Sara Helou?</AlertDialogTitle>
          <AlertDialogDescription>The member can no longer check in.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep active</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Deactivate member
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe('AlertDialog', () => {
  it('opens as a named, described alert dialog with the focus on Cancel', async () => {
    render(<DeactivateMember />);

    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

    const dialog = screen.getByRole('alertdialog', { name: 'Deactivate Sara Helou?' });
    expect(dialog).toHaveAccessibleDescription('The member can no longer check in.');
    expect(screen.getByRole('button', { name: 'Keep active' })).toHaveFocus();
  });

  it('stays open on a click outside it', async () => {
    render(<DeactivateMember />);
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

    // A modal makes the rest of the page ignore the pointer; the press still reaches the document,
    // where an outside click is detected.
    await userEvent
      .setup({ pointerEventsCheck: PointerEventsCheckLevel.Never })
      .click(document.body);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('confirms with its action, closes and returns the focus to its trigger', async () => {
    const onConfirm = vi.fn();
    render(<DeactivateMember onConfirm={onConfirm} />);
    const trigger = screen.getByRole('button', { name: 'Deactivate' });
    await userEvent.click(trigger);

    await userEvent.click(screen.getByRole('button', { name: 'Deactivate member' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('cancels with Escape without confirming', async () => {
    const onConfirm = vi.fn();
    render(<DeactivateMember onConfirm={onConfirm} />);
    const trigger = screen.getByRole('button', { name: 'Deactivate' });
    await userEvent.click(trigger);

    await userEvent.keyboard('{Escape}');

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('has no accessibility violations while open', async () => {
    render(<DeactivateMember />);
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
