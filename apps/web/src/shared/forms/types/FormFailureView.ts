/** Why a form's submission failed, worded and ready to render (`FormFailure`). */
export type FormFailureView =
  /** Too many attempts: the wait the server asked for, counting down. */
  | { kind: 'rateLimit'; message: string }
  /** No connection, or no answer in time: the offer to send the form again. */
  | { kind: 'offline'; title: string; message: string; retryLabel: string; retry: () => void }
  /** Any other refusal: the form's title and the failure's line, with the request's reference. */
  | { kind: 'refused'; title: string; message: string; reference?: string };
