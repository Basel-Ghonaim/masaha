import { Alert, AlertAction, AlertDescription, AlertTitle, Button } from '@shared/design-system';
import type { LocationStatusView } from '../../types/LocationStatusView';

/**
 * Near me's state line under the count: asking, said as a status; in use, its lines and the ways to
 * stop and to clear it; refused or imprecise, a warning with its fallbacks.
 */
export function LocationStatus({ view }: { view: LocationStatusView }) {
  switch (view.kind) {
    case 'none':
      return null;
    case 'locating':
      return (
        <p role="status" className="text-caption text-muted-foreground">
          {view.line} {view.privacy}
        </p>
      );
    case 'granted':
      return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {view.line !== null && (
            <p className="text-caption text-muted-foreground">
              {[view.line, view.approximate, view.privacy].filter(Boolean).join(' ')}
            </p>
          )}
          {view.stop !== null && (
            <Button variant="link" size="sm" onClick={view.stop.run}>
              {view.stop.label}
            </Button>
          )}
          <Button variant="link" size="sm" onClick={view.clear.run}>
            {view.clear.label}
          </Button>
        </div>
      );
    case 'denied':
    case 'imprecise':
      return (
        <Alert variant="warning">
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
