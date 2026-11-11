import {
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useRef, type ReactNode } from 'react';
import type { SheetFrameView } from '../../types/SheetFrameView';
import { DiscardDialog } from './DiscardDialog';

/**
 * A section's Sheet (G1): from the end side, the whole width below 768 px; its title, its fields in
 * one form (`children`), its failure, and «حفظ» and «رجوع» at its foot. Every close — «رجوع», the
 * close button (named «رجوع» too), Escape, the overlay — goes through the frame, which asks first
 * while it has changes. Once closed, the focus goes back to what opened it, or to its section's
 * heading when that is gone.
 */
export function EditSheet({ frame, children }: { frame: SheetFrameView; children: ReactNode }) {
  const save = useRef<HTMLButtonElement>(null);
  return (
    <Sheet
      open={frame.open}
      onOpenChange={(open) => {
        if (!open) frame.requestClose();
      }}
    >
      <SheetContent
        side="end"
        closeLabel={frame.back}
        className="md:max-w-2xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          frame.returnFocus();
        }}
      >
        <SheetHeader>
          <SheetTitle>{frame.title}</SheetTitle>
          {frame.description === null ? (
            <SheetDescription className="sr-only">{frame.title}</SheetDescription>
          ) : (
            <SheetDescription>{frame.description}</SheetDescription>
          )}
        </SheetHeader>
        <form noValidate onSubmit={frame.save.submit} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="flex flex-col gap-5 py-2">
            {children}
            {frame.failure && <FormFailure view={frame.failure} />}
          </SheetBody>
          <SheetFooter className="flex-row gap-2 border-t border-border">
            <Button
              ref={save}
              type="submit"
              loading={frame.save.pending}
              disabled={frame.save.blocked}
            >
              {frame.save.label}
            </Button>
            <Button type="button" variant="outline" onClick={frame.requestClose}>
              {frame.back}
            </Button>
          </SheetFooter>
        </form>
        <DiscardDialog view={frame.discard} returnFocus={save} />
      </SheetContent>
    </Sheet>
  );
}
