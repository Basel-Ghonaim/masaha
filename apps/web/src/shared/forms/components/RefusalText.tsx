import type { AppError } from '@shared/errors';
import { useRefusalView } from '../hooks/useRefusalView';

/**
 * Why an action failed, under its toast's title, as any refusal is read: the refusal's line, with the
 * request's reference when it has no domain code; for too many requests, the wait counting down.
 */
export function RefusalText({ refusal, title }: { refusal: AppError; title: string }) {
  const { view } = useRefusalView(refusal, title);
  if (view === null) return null;

  return (
    <>
      {view.message}
      {view.kind === 'refused' && view.reference !== undefined && (
        <span className="block">{view.reference}</span>
      )}
    </>
  );
}
