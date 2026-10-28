import {
  Alert,
  AlertDescription,
  ArrowEndIcon,
  Badge,
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
import { Link } from 'react-router';
import { useDecideSheet } from '../../hooks/decide/useDecideSheet';
import type { DecideTarget } from '../../types/DecideTarget';

/**
 * The decision sheet (screen 23), at the end side, full width below 768 px: its title names the
 * field, its description «زائر» and the day, the status beside them; the report in a box, «تعديل
 * الحقل», then the decision — a decided report's, or the reply and «تم التصحيح» and «لم يُعتمد».
 * Radix's first focus passes over links, so it lands on the reply, or on a decided report's close
 * button. While a decision is sent nothing closes it; a failure shows above the footer, the reply
 * kept. Closed, the focus goes where `returnFocus` says while it is on the page, else where Radix
 * returns it.
 */
export function DecideSheet({
  target,
  editLink,
  showDecided,
  onClose,
  returnFocus,
}: {
  target: DecideTarget;
  editLink: string | null;
  showDecided: () => void;
  onClose: () => void;
  returnFocus: () => HTMLElement | null;
}) {
  const view = useDecideSheet({ target, editLink, showDecided, onClose });
  const { busy } = view;

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) view.close();
      }}
    >
      <SheetContent
        side="end"
        closeLabel={view.closeLabel}
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
          <div className="flex flex-wrap items-center gap-2">
            <SheetDescription>{view.description}</SheetDescription>
            <Badge variant={view.status.tone}>{view.status.label}</Badge>
          </div>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="flex flex-col gap-4 pb-4">
            <div className="flex flex-col gap-1 rounded-lg bg-muted p-3">
              <span className="text-caption text-muted-foreground">{view.facts.label}</span>
              <p
                dir="auto"
                className={
                  view.facts.message.none
                    ? 'text-body-sm text-muted-foreground'
                    : 'text-body-sm break-words whitespace-pre-line'
                }
              >
                {view.facts.message.text}
              </p>
            </div>
            {view.editLink !== null && (
              <Button asChild variant="outline" className="self-start">
                <Link to={view.editLink.to}>
                  {view.editLink.label}
                  <ArrowEndIcon aria-hidden />
                </Link>
              </Button>
            )}
            {view.decided !== null && (
              <Alert>
                <AlertDescription>
                  <p className="text-label">{view.decided.label}</p>
                  <p className="break-words whitespace-pre-line">{view.decided.reply}</p>
                </AlertDescription>
              </Alert>
            )}
            {view.reply !== null && (
              <Field label={view.reply.label} helper={view.reply.helper} error={view.reply.error}>
                <Textarea dir="auto" {...view.reply.field} />
              </Field>
            )}
            {view.failure !== null && <FormFailure view={view.failure} />}
          </SheetBody>
          {view.resolve !== null && view.dismiss !== null && (
            <SheetFooter className="flex flex-row gap-2">
              <Button
                type="button"
                className="flex-1"
                loading={view.resolve.busy}
                aria-disabled={busy || view.blocked || undefined}
                onClick={view.resolve.run}
              >
                {view.resolve.label}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                loading={view.dismiss.busy}
                aria-disabled={busy || view.blocked || undefined}
                onClick={view.dismiss.run}
              >
                {view.dismiss.label}
              </Button>
            </SheetFooter>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
