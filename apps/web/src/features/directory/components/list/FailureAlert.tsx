import { Alert, AlertAction, AlertDescription, AlertTitle, Button } from '@shared/design-system';
import type { ListFailureView } from '../../types/DirectoryListView';

/** A failure to load or to refresh the list: its title, its line, its reference and the retry. */
export function FailureAlert({ failure }: { failure: ListFailureView }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{failure.title}</AlertTitle>
      <AlertDescription>
        <p>{failure.line}</p>
        {failure.reference !== null && <p>{failure.reference}</p>}
      </AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          disabled={failure.retry.blocked}
          onClick={failure.retry.run}
        >
          {failure.retry.label}
        </Button>
      </AlertAction>
    </Alert>
  );
}
