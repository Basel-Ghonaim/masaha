import {
  Alert,
  AlertAction,
  AlertDescription,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@shared/design-system';
import type { ReactNode } from 'react';
import type { SpacePageView } from '../../types/SpacePageView';

/**
 * An unverified space's notice: our team collected its information, dated, and «هل تدير هذه المساحة؟
 * تواصل معنا», which opens a dialog with the platform's contact (`ownerContact`, the page's).
 */
export function UnverifiedNotice({
  unverified,
  ownerContact,
}: {
  unverified: NonNullable<SpacePageView['unverified']>;
  ownerContact: ReactNode;
}) {
  const { dialog } = unverified;
  return (
    <Alert variant="info">
      {unverified.text !== null && <AlertDescription>{unverified.text}</AlertDescription>}
      <AlertAction>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {unverified.contact}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dialog.title}</DialogTitle>
              <DialogDescription>{dialog.text}</DialogDescription>
            </DialogHeader>
            {ownerContact}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{dialog.close}</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AlertAction>
    </Alert>
  );
}
