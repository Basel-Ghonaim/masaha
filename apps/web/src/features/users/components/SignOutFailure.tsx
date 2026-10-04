import type { SignOutFailureView } from '../types/SignOutFailureView';

/** Why the sign-out failed, as the account's hook worded it. */
export function SignOutFailure({ failure }: { failure: SignOutFailureView }) {
  return (
    <div role="alert" className="flex flex-col text-caption text-destructive">
      <p>{failure.title}</p>
      <p>{failure.message}</p>
    </div>
  );
}
