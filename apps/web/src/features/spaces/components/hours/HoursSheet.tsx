import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Checkbox,
  Field,
  Switch,
} from '@shared/design-system';
import { useHoursSheet } from '../../hooks/hours/useHoursSheet';
import type { SectionHost } from '../../types/SectionHost';
import { EditSheet } from '../editor/EditSheet';
import { TimeSelect } from './TimeSelect';

/**
 * «ساعات العمل»'s Sheet (W2–W5): the simple view — Saturday to Thursday, Friday's box and its own
 * range, «تخصيص الأيام» — or every day a block, its switch and its two times, with the way back to
 * the simple view, which asks first when the days differ.
 */
export function HoursSheet({ host }: { host: SectionHost }) {
  const view = useHoursSheet(host);
  const { simple, days } = view;

  return (
    <EditSheet frame={view.frame}>
      {view.noneOpen && (
        <p role="alert" className="text-body-sm text-destructive">
          {view.noneOpen}
        </p>
      )}
      {view.outside && (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-lg bg-warning-subtle px-3 py-2 text-body-sm text-warning-subtle-foreground"
        >
          <p>{view.outside.line}</p>
          <div>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-0"
              onClick={view.outside.link.run}
            >
              {view.outside.link.label}
            </Button>
          </div>
        </div>
      )}
      {!view.custom ? (
        <>
          <fieldset className="flex flex-col gap-3">
            <legend className="pb-2 text-label">{simple.legend}</legend>
            <div className="grid grid-cols-2 gap-3">
              <TimeSelect time={simple.main.from} />
              <TimeSelect time={simple.main.to} error={simple.mainError} />
            </div>
          </fieldset>
          <div className="flex flex-col gap-3">
            <Field label={simple.friday.label} orientation="horizontal">
              <Checkbox
                checked={simple.friday.checked}
                onCheckedChange={(checked) => {
                  simple.friday.toggle(checked === true);
                }}
              />
            </Field>
            {simple.friday.checked ? (
              <fieldset className="grid grid-cols-2 gap-3 ps-7">
                <legend className="sr-only">{simple.friday.legend}</legend>
                <TimeSelect time={simple.friday.range.from} />
                <TimeSelect time={simple.friday.range.to} error={simple.friday.error} />
              </fieldset>
            ) : (
              <p className="ps-7 text-body-sm text-muted-foreground">{simple.friday.closed}</p>
            )}
          </div>
          <div>
            <Button type="button" variant="outline" onClick={simple.customise.run}>
              {simple.customise.label}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-body-sm text-muted-foreground">{days.hint}</p>
          <ul className="flex flex-col gap-2">
            {days.rows.map((day) => (
              <li key={day.key}>
                <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3">
                  <legend className="sr-only">{day.name}</legend>
                  <div className="flex items-center justify-between gap-3">
                    <span aria-hidden className="text-label">
                      {day.name}
                    </span>
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="text-body-sm text-muted-foreground">
                        {day.state}
                      </span>
                      <Switch
                        aria-label={day.toggle.label}
                        checked={day.toggle.checked}
                        disabled={day.toggle.disabled}
                        onCheckedChange={day.toggle.run}
                      />
                    </span>
                  </div>
                  {day.range && (
                    <div className="grid grid-cols-2 gap-3">
                      <TimeSelect time={day.range.from} />
                      <TimeSelect time={day.range.to} error={day.error} />
                    </div>
                  )}
                </fieldset>
              </li>
            ))}
          </ul>
          <div>
            <Button type="button" variant="ghost" onClick={days.simple.run}>
              {days.simple.label}
            </Button>
          </div>
        </>
      )}
      <AlertDialog
        open={view.unify.open}
        onOpenChange={(open) => {
          if (!open) view.unify.stay();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{view.unify.title}</AlertDialogTitle>
            <AlertDialogDescription>{view.unify.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{view.unify.back}</AlertDialogCancel>
            <AlertDialogAction onClick={view.unify.go}>{view.unify.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EditSheet>
  );
}
