import { CircleAlertIcon, CircleCheckIcon, CircleIcon, cn } from '@shared/design-system';
import type { PasswordRulesView } from '../types/PasswordRulesView';

export type PasswordRulesProps = {
  /** The checklist, as `usePasswordRules` worded it. */
  view: PasswordRulesView;
  /** For the password control's `aria-describedby`. */
  id?: string;
};

const MARKS = {
  met: <CircleCheckIcon aria-hidden className="text-success" />,
  failed: <CircleAlertIcon aria-hidden />,
  pending: <CircleIcon aria-hidden />,
};

const TONES = {
  met: 'text-foreground',
  failed: 'text-destructive',
  pending: 'text-muted-foreground',
};

/** The password's rules as a checklist: each rule with its mark, and its state read aloud. */
export function PasswordRules({ view, id }: PasswordRulesProps) {
  return (
    <ul id={id} aria-label={view.label} className="flex flex-col gap-1">
      {view.rules.map(({ rule, text, state, status }) => (
        <li key={rule} className={cn('flex items-center gap-2 text-caption', TONES[state])}>
          {MARKS[state]}
          <span>
            {text} <span className="sr-only">{status}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
