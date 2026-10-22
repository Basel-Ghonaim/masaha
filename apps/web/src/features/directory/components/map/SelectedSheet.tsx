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
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { DirectoryMapView } from '../../types/DirectoryMapView';
import { SpaceSummary } from './SpaceSummary';

/**
 * Below 768 px, the chosen space in a bottom sheet that never traps the map (U6, design issue 22):
 * not modal, so the map behind it still pans and its marks are still chosen; it takes no focus on
 * opening, and a tap on the map does not close it. «إغلاق» or Escape does.
 */
export function SelectedSheet({
  selected,
  href,
  areaName,
  onClose,
}: {
  selected: NonNullable<DirectoryMapView['selected']>;
  href: string;
  areaName: ReactNode;
  onClose: () => void;
}) {
  const { card } = selected;

  return (
    <Sheet
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        closeLabel={selected.closeLabel}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
      >
        <SheetHeader>
          <SheetTitle>
            <span lang={card.name.lang} dir={card.name.dir}>
              {card.name.text}
            </span>
          </SheetTitle>
          <SheetDescription>{areaName}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <SpaceSummary card={card} />
        </SheetBody>
        <SheetFooter>
          <Button asChild size="lg" className="w-full">
            <Link to={href}>{selected.details}</Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
