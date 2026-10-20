import {
  Button,
  Field,
  Input,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useCopy } from '@shared/copy';
import { useState } from 'react';
import { SpaceCombobox } from '../SpaceCombobox';
import { AddOwnerNotice } from './AddOwnerNotice';
import { useAddOwnerForm } from '../../hooks/add-owner/useAddOwnerForm';
import type { TemporaryPasswordSlot } from '../../types/TemporaryPasswordSlot';

export function AddOwner({ temporaryPassword }: { temporaryPassword: TemporaryPasswordSlot }) {
  const copy = useCopy();
  const lines = copy.spaceLinks.addOwner;
  const form = useAddOwnerForm();
  // «إضافة مالك», where the page's password dialog returns the focus once done.
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);

  return (
    <>
      <Sheet open={form.open} onOpenChange={form.setOpen}>
        <SheetTrigger asChild>
          <Button ref={setTrigger}>{lines.open}</Button>
        </SheetTrigger>
        <SheetContent side="end" closeLabel={lines.close}>
          <SheetHeader>
            <SheetTitle>{lines.title}</SheetTitle>
            <SheetDescription>{lines.description}</SheetDescription>
          </SheetHeader>
          <form noValidate onSubmit={form.submit.run} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="flex flex-col gap-4">
              <Field label={form.labels.name} error={form.errors.name}>
                <Input {...form.fields.name} />
              </Field>
              <Field label={form.labels.email} error={form.errors.email}>
                <Input type="email" dir="ltr" {...form.fields.email} />
              </Field>
              <Field label={form.labels.space} error={form.errors.spaceId}>
                <SpaceCombobox
                  choices={form.spaceChoices}
                  chosen={form.chosenSpace}
                  choose={form.chooseSpace}
                  placeholder={form.labels.chooseSpace}
                  triggerRef={form.spaceTriggerRef}
                />
              </Field>
              <AddOwnerNotice notice={form.notice} />
              {form.failure !== null && <FormFailure view={form.failure} />}
            </SheetBody>
            <SheetFooter>
              <Button
                type="submit"
                className="w-full"
                loading={form.submit.isPending}
                disabled={form.submit.blocked}
              >
                {form.submit.label}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      {/* Outside the sheet, which closes once the owner is added. */}
      {form.added !== null && temporaryPassword(form.added, form.done, { current: trigger })}
    </>
  );
}
