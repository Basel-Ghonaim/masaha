import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/design-system';
import { useRef } from 'react';

type LeaveGuardView = {
  open: boolean;
  title: string;
  description: string;
  stay: { label: string; run: () => void };
  leave: { label: string; run: () => void };
};

/**
 * Asks before the page is left with unsaved changes, naming the sections: "Stay", which has the
 * focus, keeps them; "Leave" drops them and goes on.
 */
export function LeaveDialog({ guard }: { guard: LeaveGuardView }) {
  // Each answer closes the dialog too; only a close with no answer, by Escape, means "Stay".
  const answered = useRef(false);
  const answer = (choice: { run: () => void }) => () => {
    answered.current = true;
    choice.run();
  };

  return (
    <AlertDialog
      open={guard.open}
      onOpenChange={(open) => {
        if (open || answered.current) {
          answered.current = false;
          return;
        }
        guard.stay.run();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{guard.title}</AlertDialogTitle>
          <AlertDialogDescription>{guard.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={answer(guard.stay)}>{guard.stay.label}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={answer(guard.leave)}>
            {guard.leave.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
