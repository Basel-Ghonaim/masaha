import {
  Badge,
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@shared/design-system';
import type { ReactNode } from 'react';
import type { FiltersView } from '../../types/FiltersView';

/**
 * Below 1024 px, the filters in a bottom sheet. Its button is the sheet's own trigger, so it says
 * whether the sheet is open; its badge counts the filters in force, its words read in its place
 * (design issue 2). The primary button counts the spaces the filters leave and closes the sheet.
 */
export function FiltersSheet({
  sheet,
  children,
}: {
  sheet: FiltersView['sheet'];
  children: ReactNode;
}) {
  return (
    <Sheet open={sheet.open} onOpenChange={sheet.setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="flex-1 md:flex-none">
          {sheet.title}
          {sheet.count > 0 && (
            <>
              {/* A space, so the button's text and the count's words are heard as two. */}{' '}
              <Badge variant="primary" aria-hidden>
                {sheet.count}
              </Badge>
              <span className="sr-only">{sheet.applied}</span>
            </>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" closeLabel={sheet.close}>
        <SheetHeader>
          <SheetTitle>{sheet.title}</SheetTitle>
          <SheetDescription>{sheet.description}</SheetDescription>
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
        <SheetFooter>
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              sheet.setOpen(false);
            }}
          >
            {sheet.show}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={sheet.clear.disabled}
            onClick={sheet.clear.run}
          >
            {sheet.clear.label}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
