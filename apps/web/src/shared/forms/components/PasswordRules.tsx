import { CircleCheckIcon, cn } from '@shared/design-system';
import type { PasswordRulesView } from '../types/PasswordRulesView';

export type PasswordRulesProps = {
  /** The condition's line, as `usePasswordRules` worded it. */
  view: PasswordRulesView;
  /** For the password control's `aria-describedby`. */
  id?: string;
};

const TONES = {
  needs: 'text-muted-foreground',
  missing: 'text-muted-foreground',
  met: 'text-foreground',
  failed: 'text-destructive',
};

/**
 * The password's condition as one line under the field (A7), the field's description: what it
 * needs, what is still missing, or, met, a tick and that it is fine.
 */
export function PasswordRules({ view, id }: PasswordRulesProps) {
  return (
    <p id={id} className={cn('flex items-center gap-1.5 text-caption', TONES[view.state])}>
      {view.state === 'met' && <CircleCheckIcon aria-hidden className="size-4 text-success" />}
      {view.line}
    </p>
  );
}
