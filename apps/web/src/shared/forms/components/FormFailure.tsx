import { Alert, AlertAction, AlertDescription, AlertTitle, Button } from '@shared/design-system';
import type { FormFailureView } from '../types/FormFailureView';

/**
 * Why a form's submission failed, above its fields, as the form's hook worded it: a warning for too
 * many attempts, the offer to try again when the form could not be sent, or the refusal with its
 * title and, when it has one, the request's reference.
 */
export function FormFailure({ view }: { view: FormFailureView }) {
  if (view.kind === 'rateLimit') {
    return (
      <Alert variant="warning">
        <AlertDescription>{view.message}</AlertDescription>
      </Alert>
    );
  }

  if (view.kind === 'offline') {
    return (
      <Alert variant="destructive">
        <AlertTitle>{view.title}</AlertTitle>
        <AlertDescription>{view.message}</AlertDescription>
        <AlertAction>
          <Button type="button" variant="outline" size="sm" onClick={view.retry}>
            {view.retryLabel}
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>{view.title}</AlertTitle>
      <AlertDescription>
        <p>{view.message}</p>
        {view.reference !== undefined && <p>{view.reference}</p>}
      </AlertDescription>
    </Alert>
  );
}
