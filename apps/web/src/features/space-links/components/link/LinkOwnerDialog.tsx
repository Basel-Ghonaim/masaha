import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { RefObject } from 'react';
import { Link } from 'react-router';
import { useLinkOwnerDialog } from '../../hooks/link/useLinkOwnerDialog';
import type { LinkTarget } from '../../types/LinkTarget';
import { NamedLine } from '../NamedLine';
import { SpaceCombobox } from '../SpaceCombobox';
import { PersonCombobox } from './PersonCombobox';

/**
 * Links an owner to a space, from either end (`target`): one choice, what the link does said before
 * it is made, and «ربط». A refusal shows inside, and the dialog stays open; linked, or dismissed, it
 * closes (`onClose`) and the focus returns to the control that opened it (`returnFocus`). From a
 * space, a line leads to the owners page, where an owner with no account is added.
 */
export function LinkOwnerDialog({
  target,
  onClose,
  returnFocus,
}: {
  target: LinkTarget;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const dialog = useLinkOwnerDialog(target, onClose);
  const { picker } = dialog;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        closeLabel={dialog.closeLabel}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {typeof dialog.title === 'string' ? dialog.title : <NamedLine line={dialog.title} />}
          </DialogTitle>
          <DialogDescription>{dialog.description}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void dialog.submit.run();
          }}
        >
          {dialog.failure !== null && <FormFailure view={dialog.failure} />}
          <Field label={dialog.field.label} helper={dialog.field.helper} error={dialog.field.error}>
            {picker.from === 'space' ? (
              <PersonCombobox
                choices={picker.choices}
                chosen={picker.chosen}
                choose={picker.choose}
                placeholder={dialog.field.placeholder}
                triggerRef={dialog.triggerRef}
              />
            ) : (
              <SpaceCombobox
                choices={picker.choices}
                chosen={picker.chosen}
                choose={picker.choose}
                placeholder={dialog.field.placeholder}
                triggerRef={dialog.triggerRef}
              />
            )}
          </Field>
          <div aria-live="polite" className="flex flex-col gap-1 text-body-sm">
            {dialog.consequence.map((line, index) => (
              <p key={index}>{typeof line === 'string' ? line : <NamedLine line={line} />}</p>
            ))}
          </div>
          {dialog.addOwner !== undefined && (
            <p className="text-body-sm">
              <Link to={dialog.addOwner.link} className="underline underline-offset-4">
                {dialog.addOwner.text}
              </Link>
            </p>
          )}
          <DialogFooter>
            <Button type="submit" loading={dialog.submit.busy} disabled={dialog.submit.blocked}>
              {dialog.submit.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
