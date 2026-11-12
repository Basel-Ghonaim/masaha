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
import { useRef, type RefObject } from 'react';
import type { SheetFrameView } from '../../types/SheetFrameView';

/**
 * «تجاهل التغييرات؟», asked before a Sheet with changes closes: «رجوع», which has the focus, goes
 * back to the Sheet with the focus on its «حفظ» (`returnFocus`); «تجاهل التغييرات», destructive,
 * closes the Sheet with nothing sent.
 */
export function DiscardDialog({
  view,
  returnFocus,
}: {
  view: SheetFrameView['discard'];
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  // A discard closes the Sheet too, whose own close gives the focus back.
  const discarded = useRef(false);
  return (
    <AlertDialog
      open={view.open}
      onOpenChange={(open) => {
        if (!open && !discarded.current) view.stay();
      }}
    >
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (discarded.current) {
            discarded.current = false;
            return;
          }
          returnFocus.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{view.title}</AlertDialogTitle>
          <AlertDialogDescription>{view.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{view.back}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              discarded.current = true;
              view.leave();
            }}
          >
            {view.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
