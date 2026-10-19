import {
  Button,
  CheckIcon,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  RadioGroup,
  RadioGroupItem,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useRef } from 'react';
import {
  useTemporaryPasswordDialog,
  type TemporaryPasswordDialogInput,
} from '../../hooks/temporary-password/useTemporaryPasswordDialog';

export function TemporaryPasswordDialog(props: TemporaryPasswordDialogInput) {
  const channelRef = useRef<HTMLDivElement | null>(null);
  const dialog = useTemporaryPasswordDialog({ ...props, channelRef });

  return (
    <Dialog open>
      <DialogContent
        onEscapeKeyDown={(event) => {
          event.preventDefault();
        }}
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{dialog.title}</DialogTitle>
          <DialogDescription>
            <bdi>{dialog.person.name}</bdi>
            <span> · </span>
            <span dir="ltr">{dialog.person.email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-muted p-3" dir="ltr">
            <p className="text-heading-3 select-all">{dialog.password}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void dialog.copy.run()}>
            {dialog.copy.copied ? (
              <>
                <CheckIcon aria-hidden />
                {dialog.copy.copiedLabel}
              </>
            ) : (
              dialog.copy.label
            )}
          </Button>
          {dialog.copyFailed !== null && (
            <p className="text-caption text-destructive">{dialog.copyFailed}</p>
          )}
          <p className="text-body-sm text-muted-foreground">{dialog.line}</p>

          <Field label={dialog.channel.label} error={dialog.channel.error ?? undefined}>
            <RadioGroup
              ref={channelRef}
              value={dialog.channel.value}
              onValueChange={(value) => {
                dialog.channel.choose(value as 'WHATSAPP' | 'IN_PERSON' | 'OTHER');
              }}
              className="grid grid-cols-3 gap-2"
            >
              {dialog.channel.options.map((option) => (
                <Field key={option.value} orientation="horizontal" label={option.label}>
                  <RadioGroupItem value={option.value} />
                </Field>
              ))}
            </RadioGroup>
          </Field>

          {dialog.failure !== null && <FormFailure view={dialog.failure} />}
        </div>

        <DialogFooter>
          {dialog.done.reason !== undefined && (
            <p id="done-reason" className="text-caption text-muted-foreground">
              {dialog.done.reason}
            </p>
          )}
          <Button
            type="button"
            disabled={dialog.done.disabled}
            loading={dialog.done.busy}
            aria-describedby={dialog.done.reason === undefined ? undefined : 'done-reason'}
            onClick={() => void dialog.done.run()}
          >
            {dialog.done.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
