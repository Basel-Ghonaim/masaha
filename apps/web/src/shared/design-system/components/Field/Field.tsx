import { isValidElement, useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { FieldContext, type FieldContextValue } from './useFieldControl';

export type FieldProps = Omit<ComponentProps<'div'>, 'children'> & {
  label: ReactNode;
  /** Shown at the end of the label's row, such as a "Forgot your password?" link. */
  labelEnd?: ReactNode;
  /** Guidance shown under the control and read with it. */
  helper?: ReactNode;
  /** The validation message. While present, the control is invalid. */
  error?: ReactNode;
  /** Horizontal puts the control before its label: a checkbox or switch row. */
  orientation?: 'vertical' | 'horizontal';
  /**
   * The one control, which reads its id and descriptions from the Field. When it is `disabled`,
   * the whole Field is shown disabled.
   */
  children: ReactNode;
};

// A message given as `submitted && error` is false until it applies; like null, it shows nothing.
function isShown(message: ReactNode) {
  return message !== undefined && message !== null && message !== false && message !== '';
}

function isDisabled(control: ReactNode) {
  return isValidElement<{ disabled?: unknown }>(control) && control.props.disabled === true;
}

// The control dims itself; the Field's own text dims with it. A disabled Field also dims the Fields
// inside it, such as the options of a disabled RadioGroup.
const DIMMED_WHEN_DISABLED = 'group-data-disabled/field:opacity-50';

/**
 * A label, its control, and the helper and error text that describe the control. The Field owns the
 * ids and hands them to the control through context, so the label, `aria-describedby` and
 * `aria-invalid` are wired without the page passing ids around.
 */
export function Field({
  label,
  labelEnd,
  helper,
  error,
  orientation = 'vertical',
  className,
  children,
  ...props
}: FieldProps) {
  const id = useId();
  const hasHelper = isShown(helper);
  const hasError = isShown(error);
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  // The error is read first: it is what the user has to act on.
  const describedBy = [hasError && errorId, hasHelper && helperId].filter(Boolean).join(' ');
  const context: FieldContextValue = {
    controlId: `${id}-control`,
    labelId: `${id}-label`,
    describedBy: describedBy === '' ? undefined : describedBy,
    invalid: hasError,
  };

  const labelRow = (
    <div className={cn('flex items-center justify-between gap-2', DIMMED_WHEN_DISABLED)}>
      <label
        id={context.labelId}
        htmlFor={context.controlId}
        className={cn(
          'text-label text-foreground',
          // In a row the whole label height is part of the target, so the row is a full control tall.
          orientation === 'horizontal' && 'flex min-h-(--control-height) items-center',
        )}
      >
        {label}
      </label>
      {labelEnd}
    </div>
  );
  const messages = (
    <>
      {hasHelper && (
        <p id={helperId} className={cn('text-caption text-muted-foreground', DIMMED_WHEN_DISABLED)}>
          {helper}
        </p>
      )}
      {hasError && (
        <p id={errorId} className={cn('text-caption text-destructive', DIMMED_WHEN_DISABLED)}>
          {error}
        </p>
      )}
    </>
  );
  const rootProps = {
    'data-slot': 'field',
    'data-disabled': isDisabled(children) || undefined,
    ...props,
  };

  return (
    <FieldContext value={context}>
      {orientation === 'vertical' ? (
        <div className={cn('group/field flex flex-col gap-1.5', className)} {...rootProps}>
          {labelRow}
          {children}
          {messages}
        </div>
      ) : (
        <div className={cn('group/field flex items-start gap-3', className)} {...rootProps}>
          <div className="flex h-(--control-height) shrink-0 items-center">{children}</div>
          <div className="flex flex-col">
            {labelRow}
            {messages}
          </div>
        </div>
      )}
    </FieldContext>
  );
}
