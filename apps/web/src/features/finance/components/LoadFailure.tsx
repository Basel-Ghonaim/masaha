import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
  WifiOffIcon,
} from '@shared/design-system';
import type { LoadFailureView } from '../hooks/useLoadFailure';

/** A finance tab that could not load: offline (P7), or the destructive alert; each with its retry. */
export function LoadFailure({ failure }: { failure: LoadFailureView }) {
  const retry = (
    <Button variant="outline" disabled={failure.blocked} onClick={failure.retry}>
      {failure.retryLabel}
    </Button>
  );
  if (failure.offline) {
    return (
      <EmptyState
        icon={<WifiOffIcon />}
        title={failure.title}
        titleAs="h2"
        description={failure.message}
      >
        {retry}
      </EmptyState>
    );
  }
  return (
    <Alert variant="destructive">
      <AlertTitle>{failure.title}</AlertTitle>
      <AlertDescription>
        {failure.message}
        {failure.reference !== undefined && <span className="block">{failure.reference}</span>}
      </AlertDescription>
      <AlertAction>{retry}</AlertAction>
    </Alert>
  );
}
