import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';
import { Button, type ButtonProps } from '../Button';
import { modalContentClasses, overlayClasses } from '../Dialog';

/**
 * A confirmation that must be answered: check a member out, deactivate a member, hide a space. Unlike
 * Dialog, a click outside does not dismiss it, and it opens with the focus on Cancel, so a stray
 * Enter never confirms. Escape cancels.
 */
export function AlertDialog(props: ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

export function AlertDialogTrigger(props: ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

export function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay data-slot="alert-dialog-overlay" className={overlayClasses} />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(modalContentClasses, className)}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

/** The answers, at the end of the window: stacked on a phone with the action on top. */
export function AlertDialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

export function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn('text-heading-3', className)}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn('text-body text-muted-foreground', className)}
      {...props}
    />
  );
}

type AnswerProps<Primitive> = Primitive & Pick<ButtonProps, 'variant' | 'size'>;

/** Confirms and closes. `variant="destructive"` for an action that removes or deactivates. */
export function AlertDialogAction({
  variant = 'primary',
  size,
  ...props
}: AnswerProps<ComponentProps<typeof AlertDialogPrimitive.Action>>) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Action data-slot="alert-dialog-action" {...props} />
    </Button>
  );
}

export function AlertDialogCancel({
  variant = 'outline',
  size,
  ...props
}: AnswerProps<ComponentProps<typeof AlertDialogPrimitive.Cancel>>) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" {...props} />
    </Button>
  );
}
