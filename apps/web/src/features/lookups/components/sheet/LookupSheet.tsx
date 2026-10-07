import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@shared/design-system';
import { useState, type ReactNode } from 'react';
import type { SheetView } from '../../types/SheetView';

/**
 * The side sheet that adds or edits a governorate, an area or an amenity, with the button that opens
 * it. The button is its trigger, so the focus returns to it when the sheet closes. The form inside
 * is mounted only while the sheet is open, so each opening starts from the row as it stands; it
 * closes the sheet with `close` once it has saved.
 */
export function LookupSheet({
  sheet,
  variant,
  children,
}: {
  sheet: SheetView;
  /**
   * `ghost` for a row's Edit, `outline` for an Add at the foot of a list, `primary` for an Add in a
   * card's header.
   */
  variant: 'ghost' | 'outline' | 'primary';
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant={variant} size="sm" aria-label={sheet.triggerName}>
          {sheet.trigger}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="end"
        closeLabel={sheet.closeLabel}
        // Without a description, the dialog is described by nothing rather than by a missing id.
        {...(sheet.description === undefined && { 'aria-describedby': undefined })}
      >
        <SheetHeader>
          <SheetTitle>{sheet.title}</SheetTitle>
          {sheet.description !== undefined && (
            <SheetDescription>
              <span lang="en" dir="auto">
                {sheet.description}
              </span>
            </SheetDescription>
          )}
        </SheetHeader>
        {children(() => {
          setOpen(false);
        })}
      </SheetContent>
    </Sheet>
  );
}
