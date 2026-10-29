import type { AnnouncementState } from '@masaha/shared/announcements';
import {
  Alert,
  AlertDescription,
  Button,
  Field,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useAnnouncementSheet } from '../../hooks/sheet/useAnnouncementSheet';
import type { SheetEntry } from '../../types/SheetEntry';
import { AnnouncementItem } from '../public/AnnouncementItem';
import { ClosureAlert } from '../public/ClosureNotice';
import { PeriodFields } from './PeriodFields';
import { TypeChoice } from './TypeChoice';

/**
 * «إعلان جديد» / «تعديل الإعلان» (screen 18), the end sheet, full width on a phone: the type, focused
 * first on its checked radio (DI-21); the Arabic text and the English one; the period; a closure's
 * line (DI-29); the preview of the space's page, drawn by the page's own pieces (DI-25); one submit.
 * It is mounted for one opening (its key is that opening's); while it is sent nothing closes it; a
 * failure shows above the footer, every value kept. Closed, the focus goes back to the control that
 * opened it (`returnFocus`) while it is on the page.
 */
export function AnnouncementSheet({
  spaceId,
  entry,
  showTab,
  returnFocus,
  onClose,
}: {
  spaceId: number;
  entry: SheetEntry;
  showTab: (state: AnnouncementState) => void;
  returnFocus: () => HTMLElement | null;
  onClose: () => void;
}) {
  const view = useAnnouncementSheet({ spaceId, entry, showTab, onClose });
  const busy = view.submit.busy;

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <SheetContent
        side="end"
        closeLabel={view.closeLabel}
        // The checked type first, with the layer's ring, whatever Radix would pick (DI-21).
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (event.target instanceof HTMLElement) {
            event.target
              .querySelector<HTMLElement>('[data-slot="radio-group-item"][aria-checked="true"]')
              ?.focus();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          const target = returnFocus();
          if (target?.isConnected === true) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <SheetHeader>
          <SheetTitle>{view.title}</SheetTitle>
          <SheetDescription>{view.description}</SheetDescription>
        </SheetHeader>
        <form noValidate onSubmit={view.submit.run} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="flex min-w-0 flex-col gap-5 pb-4">
            <TypeChoice view={view.type} disabled={busy} />
            <Field label={view.textAr.label} helper={view.textAr.helper} error={view.textAr.error}>
              <Textarea lang="ar" dir="rtl" aria-required {...view.textAr.field} />
            </Field>
            <Field
              label={view.textEn.label}
              labelEnd={
                <span className="text-caption text-muted-foreground">{view.textEn.optional}</span>
              }
              helper={view.textEn.helper}
              error={view.textEn.error}
            >
              <Textarea lang="en" dir="ltr" {...view.textEn.field} />
            </Field>
            <PeriodFields start={view.start} end={view.end} disabled={busy} />
            {view.closure !== null && (
              <Alert variant="warning">
                <AlertDescription>{view.closure}</AlertDescription>
              </Alert>
            )}
            <section aria-label={view.preview.label} className="flex flex-col gap-2">
              <p aria-hidden className="text-caption text-muted-foreground">
                {view.preview.label}
              </p>
              <div className="rounded-lg bg-muted p-3">
                {view.preview.closure ? (
                  <ClosureAlert item={view.preview.item} notice={view.preview.notice} />
                ) : (
                  <AnnouncementItem item={view.preview.item} />
                )}
              </div>
            </section>
            {view.notice !== null && (
              <Alert variant="info">
                <AlertDescription>{view.notice}</AlertDescription>
              </Alert>
            )}
            {view.failure !== null && <FormFailure view={view.failure} />}
          </SheetBody>
          <SheetFooter>
            <Button type="submit" className="w-full" loading={busy} disabled={view.submit.blocked}>
              {view.submit.label}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
