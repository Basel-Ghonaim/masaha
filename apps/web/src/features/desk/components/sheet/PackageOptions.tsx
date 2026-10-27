import {
  Alert,
  AlertAction,
  AlertDescription,
  Button,
  Field,
  RadioGroup,
  RadioGroupItem,
  Skeleton,
} from '@shared/design-system';
import { useId } from 'react';
import type { SubscriptionSheetView } from '../../hooks/sheet/useSubscriptionSheet';

/**
 * The sheet's choices, one radio group named «الباقة»: each group under its heading, each option in
 * one line (DK-007) — its name, its price, and its terms in a plain caption (DI-45: no warning icon) —
 * and «مخصّص» last; a renewal's package alone, as one line with «تغيير الباقة», until it is changed.
 * While the choices load, three skeletons; failed, the line and «إعادة المحاولة». Inside the sheet's
 * form, its buttons only act: they never send it.
 */
export function PackageOptions({
  view,
  disabled,
}: {
  view: SubscriptionSheetView['packages'];
  disabled: boolean;
}) {
  const baseId = useId();
  const { current } = view;

  if (view.state === 'loading') {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {view.state === 'failed' && (
        <Alert variant="destructive">
          <AlertDescription>{view.failed}</AlertDescription>
          <AlertAction>
            <Button type="button" variant="outline" onClick={view.retry.run}>
              {view.retry.label}
            </Button>
          </AlertAction>
        </Alert>
      )}
      {current !== null && (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-label">{view.legend}</p>
          <div className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-primary p-3">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex flex-wrap items-baseline gap-2">
                <span dir="auto" className="text-label">
                  {current.line.title}
                </span>
                {current.line.amount !== null && (
                  <span dir="ltr" className="text-label">
                    {current.line.amount}
                  </span>
                )}
              </span>
              <span className="text-caption text-muted-foreground">{current.line.terms}</span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={current.change.run}
            >
              {current.change.label}
            </Button>
          </div>
        </div>
      )}
      {view.empty !== null && <p className="text-body-sm text-muted-foreground">{view.empty}</p>}
      {current === null && view.groups.length > 0 && (
        <Field label={view.legend}>
          <RadioGroup
            value={view.chosen}
            onValueChange={view.choose}
            disabled={disabled}
            className="gap-4"
          >
            {view.groups.map((group, index) => (
              <div key={group.heading ?? `group-${String(index)}`} className="flex flex-col gap-2">
                {group.heading !== null && (
                  <p className="text-caption text-muted-foreground">{group.heading}</p>
                )}
                {group.options.map((option) => {
                  const id = `${baseId}-${option.value}`;
                  return (
                    <label
                      key={option.value}
                      htmlFor={id}
                      className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-data-checked:border-primary"
                    >
                      <RadioGroupItem id={id} value={option.value} className="mt-0.5" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-baseline justify-between gap-2">
                          <span dir="auto" className="text-label">
                            {option.title}
                          </span>
                          {option.amount !== null && (
                            <span dir="ltr" className="text-label">
                              {option.amount}
                            </span>
                          )}
                        </span>
                        <span className="text-caption text-muted-foreground">{option.terms}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </RadioGroup>
        </Field>
      )}
    </div>
  );
}
