/** One email, in both forms: clients that show no HTML show the text. */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Whether the message left. A failure is returned, never thrown: the forgotten password answers 202
 * whatever happens, or an error would tell the caller the account exists.
 */
export type EmailResult = { sent: true } | { sent: false; reason: string };

/**
 * The email port (conventions R5): external infrastructure, owned by `auth`, its only consumer, and
 * wired in the composition root. A sender carries no copy and no rule: it delivers what it is given.
 */
export interface EmailSender {
  /** `requester` is who asked for it (a digest of their address), for the caps; senders ignore it. */
  send(message: EmailMessage, context?: { requester: string }): Promise<EmailResult>;
}
