import { useCopy } from '@shared/copy';
import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogDescription,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
  Button,
  ChevronStartIcon,
} from '@shared/design-system';
import { Suspense, useEffect, useRef, useState } from 'react';
import { inPlaceHeading } from './inPlaceHeading';
import { SignInBody, SignInBodyBoundary, SignInBodyLoading } from './SignInBody';
import type { ForgotStep, SignInReason, SignInView, ViewFocus } from './signInView';

export type { SignInReason } from './signInView';

/**
 * A guest's sign-in over the page, for an action that needs an account (ADR 0021; C4, DI-60): the
 * layer's adaptive dialog, the whole screen on a phone, Back closing it. It is titled by `reason`
 * and holds the sign-in itself, register, and the request for a reset link, each a view of it; their
 * forms load the first time it opens. A sign-in there closes it from the page's side
 * (`useSignInPrompt`), the action kept; closed by the guest any way, `onClose`, which lets it go.
 */
export function SignInPrompt({
  reason,
  onClose,
}: {
  /** The action the guest pressed; none, and the prompt is closed. */
  reason: SignInReason | null;
  onClose: () => void;
}) {
  const words = useCopy().site.signInPrompt;
  // A request under way holds every way of closing (the layer's `busy`).
  const [busy, setBusy] = useState(false);

  return (
    <AdaptiveDialog
      open={reason !== null}
      busy={busy}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {reason !== null && (
        <OpenSignIn reason={reason} closeLabel={words.close} busy={busy} onBusy={setBusy} />
      )}
    </AdaptiveDialog>
  );
}

/**
 * One opening of the sign-in: its view, the email carried between views (in memory, never a
 * password), and its heading, which stays while the forms load, so the focus that lands on it as it
 * opens is never lost. Each switch of view moves the focus to the new title, or to the field the
 * view asks for.
 */
function OpenSignIn({
  reason,
  closeLabel,
  busy,
  onBusy,
}: {
  reason: SignInReason;
  closeLabel: string;
  busy: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const copy = useCopy();
  const [view, setView] = useState<SignInView>('signIn');
  // Where the focus goes once the view opened by a switch has drawn: none on the first.
  const [switched, setSwitched] = useState<{ focus: ViewFocus } | null>(null);
  const [step, setStep] = useState<ForgotStep>('loading');
  const [email, setEmail] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  const heading = inPlaceHeading(copy, reason, view, step);

  useEffect(() => {
    if (switched?.focus === 'title') title.current?.focus();
  }, [switched]);

  // The forgotten password's step changes under the control that was pressed (the link sent, a link
  // open, a retry), which is gone: the focus goes to the new title. Asked again for an email, the
  // form takes it itself (C3).
  const lastStep = useRef(step);
  useEffect(() => {
    const changed = lastStep.current !== step;
    lastStep.current = step;
    if (changed && view === 'forgot' && step !== 'request') title.current?.focus();
  }, [step, view]);

  const go = (next: SignInView, focus: ViewFocus = 'title') => {
    setView(next);
    setSwitched({ focus });
  };

  return (
    <AdaptiveDialogContent
      closeLabel={closeLabel}
      // From 768 px too, the title first (D4): the forms may still be loading, and Google's button
      // is a frame of its own; the reason is read before the fields.
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        title.current?.focus();
      }}
      {...(heading.description === undefined ? { 'aria-describedby': undefined } : {})}
    >
      {view === 'forgot' && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="self-start px-0"
          disabled={busy}
          onClick={() => {
            go('signIn');
          }}
        >
          <ChevronStartIcon aria-hidden />
          {copy.auth.forgotPassword.backToSignIn}
        </Button>
      )}
      <AdaptiveDialogHeader>
        <AdaptiveDialogTitle ref={title}>{heading.title}</AdaptiveDialogTitle>
        {heading.description !== undefined && (
          <AdaptiveDialogDescription>{heading.description}</AdaptiveDialogDescription>
        )}
      </AdaptiveDialogHeader>
      <SignInBodyBoundary
        onRetry={() => {
          title.current?.focus();
        }}
      >
        <Suspense fallback={<SignInBodyLoading />}>
          <SignInBody
            reason={reason}
            view={view}
            focusForm={switched?.focus === 'form'}
            go={go}
            email={email}
            onEmailChange={setEmail}
            onStep={setStep}
            onBusy={onBusy}
          />
        </Suspense>
      </SignInBodyBoundary>
    </AdaptiveDialogContent>
  );
}
