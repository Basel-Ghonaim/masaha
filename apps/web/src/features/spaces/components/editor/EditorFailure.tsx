import { Alert, AlertDescription, Button } from '@shared/design-system';

/** The space could not be loaded: says so, with a way to try again. */
export function EditorFailure({
  message,
  retry,
}: {
  message: string;
  retry: { label: string; run: () => void };
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>{message}</span>
        <Button type="button" variant="outline" size="sm" onClick={retry.run}>
          {retry.label}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
