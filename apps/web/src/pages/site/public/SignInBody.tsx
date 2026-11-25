import { useCopy } from '@shared/copy';
import { Alert, AlertAction, AlertDescription, Button, Spinner } from '@shared/design-system';
import { Component, lazy, type ReactNode } from 'react';
import type { InPlaceSignInProps } from '../auth/in-place/InPlaceSignIn';

// The sign-in's forms, with every auth hook and Google's loader: a chunk of their own, loaded the
// first time a guest's action opens the overlay, never with the page (ADR 0021, point 6; check:build
// holds it). A failed load is loaded again only when the guest asks.
const load = () =>
  import('../auth/in-place/InPlaceSignIn').then(({ InPlaceSignIn }) => ({
    default: InPlaceSignIn,
  }));
let Loaded = lazy(load);

/** The overlay's body: the views' forms, once their code has loaded. */
export function SignInBody(props: InPlaceSignInProps) {
  return <Loaded {...props} />;
}

/** The short wait while the forms' code loads. */
export function SignInBodyLoading() {
  const copy = useCopy();

  return (
    <div className="flex justify-center py-6">
      <Spinner label={copy.status.loading} />
    </div>
  );
}

function LoadFailed({ retry }: { retry: () => void }) {
  const copy = useCopy();

  return (
    <Alert variant="destructive">
      <AlertDescription>{copy.site.signInPrompt.loadFailed}</AlertDescription>
      <AlertAction>
        <Button type="button" variant="outline" size="sm" onClick={retry}>
          {copy.status.retry}
        </Button>
      </AlertAction>
    </Alert>
  );
}

/**
 * Holds the overlay when its forms' code could not load (no connection): the line and «إعادة
 * المحاولة», which loads it again. Nothing is loaded again by itself.
 */
export class SignInBodyBoundary extends Component<
  {
    children: ReactNode;
    /** Hears the load asked again, whose button is then gone: the place moves the focus. */
    onRetry: () => void;
  },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <LoadFailed
        retry={() => {
          Loaded = lazy(load);
          this.setState({ failed: false });
          this.props.onRetry();
        }}
      />
    );
  }
}
