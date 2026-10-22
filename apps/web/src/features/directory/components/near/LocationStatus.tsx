import { Alert, AlertAction, AlertDescription, AlertTitle, Button } from '@shared/design-system';
import type { LocationStatusView } from '../../types/LocationStatusView';

/**
 * Near me's state line under the count, in one live region that stays mounted while its content
 * changes, so each state is announced: asking; in use, its lines and the ways to stop and to clear
 * it; refused or imprecise, a warning with its fallbacks. Stopping or clearing removes the button
 * pressed, so the focus is handed back to «الأقرب إليّ» (`returnFocus`).
 */
export function LocationStatus({
  view,
  returnFocus,
}: {
  view: LocationStatusView;
  returnFocus: () => void;
}) {
  return (
    <div role="status" className="not-empty:mt-2">
      <StatusContent view={view} returnFocus={returnFocus} />
    </div>
  );
}

function StatusContent({
  view,
  returnFocus,
}: {
  view: LocationStatusView;
  returnFocus: () => void;
}) {
  switch (view.kind) {
    case 'none':
      return null;
    case 'locating':
      return (
        <p className="text-caption text-muted-foreground">
          {view.line} {view.privacy}
        </p>
      );
    case 'granted': {
      const { stop, change, clear } = view;
      return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {view.line !== null && (
            <p className="text-caption text-muted-foreground">
              {[view.line, view.approximate, view.privacy].filter(Boolean).join(' ')}
            </p>
          )}
          {stop !== null && (
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                stop.run();
                returnFocus();
              }}
            >
              {stop.label}
            </Button>
          )}
          {change !== null && (
            <Button variant="link" size="sm" onClick={change.run}>
              {change.label}
            </Button>
          )}
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              clear.run();
              returnFocus();
            }}
          >
            {clear.label}
          </Button>
        </div>
      );
    }
    case 'denied':
    case 'imprecise':
      return (
        // The region around it announces it; the alert adds no live region of its own.
        <Alert variant="warning" role="none">
          <AlertTitle>{view.title}</AlertTitle>
          <AlertDescription>{view.text}</AlertDescription>
          <AlertAction>
            {view.fallbacks.map((fallback) => (
              <Button key={fallback.label} variant="outline" size="sm" onClick={fallback.run}>
                {fallback.label}
              </Button>
            ))}
          </AlertAction>
        </Alert>
      );
  }
}
