import type { SpacePackage } from '@masaha/shared/packages';
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
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { Link } from 'react-router';
import { usePackageSheet } from '../../hooks/sheet/usePackageSheet';
import type { ShiftChoice } from '../../types/ShiftChoice';
import { ChipsField } from './ChipsField';
import { LimitsField } from './LimitsField';

/**
 * The package sheet, open from the end: a new package (`editing` `null`) or one of the list's, its
 * terms in order, a summary of what is typed, read as it changes, and «حفظ الباقة» at its foot. It
 * is mounted only while open, so each opening starts from the package as it stands; it closes on
 * Escape, its close button or a save (`close`), and the focus returns to the button that opened it.
 */
export function PackageSheet({
  spaceId,
  editing,
  shifts,
  hoursLink,
  close,
}: {
  spaceId: number;
  editing: SpacePackage | null;
  shifts: readonly ShiftChoice[] | null;
  hoursLink: string;
  close: () => void;
}) {
  const view = usePackageSheet({ spaceId, editing, shifts, hoursLink, close });
  const { shift } = view;

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <SheetContent side="end" closeLabel={view.closeLabel}>
        <SheetHeader>
          <SheetTitle>{view.title}</SheetTitle>
          <SheetDescription>{view.description}</SheetDescription>
        </SheetHeader>
        <form noValidate onSubmit={view.submit} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="flex min-w-0 flex-col gap-5 pb-4">
            <Field label={view.name.label} error={view.name.error}>
              <Input dir="auto" autoComplete="off" {...view.name.binding} />
            </Field>
            <Field
              label={view.validity.label}
              helper={view.validity.helper}
              error={view.validity.error}
            >
              <Input dir="ltr" inputMode="numeric" autoComplete="off" {...view.validity.binding} />
            </Field>
            <LimitsField view={view.limits} />
            <ChipsField {...view.billing} />
            <Field label={view.amount.label} error={view.amount.error}>
              <Input dir="ltr" inputMode="decimal" autoComplete="off" {...view.amount.binding} />
            </Field>
            <ChipsField {...view.audience} />
            {shift.state.kind === 'chips' ? (
              <ChipsField
                label={shift.label}
                error={shift.error}
                value={shift.state.value}
                options={shift.state.options}
                disabled={shift.state.disabled}
                choose={shift.state.choose}
              />
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-label text-foreground">{shift.label}</span>
                <p className="text-caption text-muted-foreground">
                  {shift.state.text}
                  {shift.state.kind === 'none' && (
                    <>
                      {' '}
                      <Link
                        to={shift.state.link.href}
                        className="text-primary underline underline-offset-4"
                      >
                        {shift.state.link.label}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            )}
            <div aria-live="polite" className="flex flex-col gap-1 rounded-lg bg-muted p-3">
              <span className="text-caption text-muted-foreground">{view.summary.label}</span>
              <span className="text-label text-foreground">{view.summary.name}</span>
              {view.summary.terms !== '' && (
                <span className="text-body-sm text-muted-foreground">{view.summary.terms}</span>
              )}
              <span className="text-body-sm text-foreground">{view.summary.price}</span>
            </div>
            {view.failure && <FormFailure view={view.failure} />}
          </SheetBody>
          <SheetFooter>
            <Button
              type="submit"
              className="w-full"
              loading={view.isPending}
              disabled={view.blocked}
            >
              {view.submitLabel}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
