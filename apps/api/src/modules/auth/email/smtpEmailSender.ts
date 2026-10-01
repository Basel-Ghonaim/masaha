import { createTransport } from 'nodemailer';

import type { EmailSender } from './emailSender.ts';

export interface SmtpSettings {
  host: string;
  port: number;
  /** Implicit TLS (port 465). False uses STARTTLS (port 587), which is then required. */
  secure: boolean;
  user: string;
  password: string;
  /** The sender, e.g. `"مساحة Masaha" <name@gmail.com>`. Gmail requires the account's own address. */
  from: string;
}

// The whole attempt is bounded: no work runs after the response (ADR 0014), so a hung relay must
// not hold the forgotten-password request open.
const TIMEOUT_MS = 10_000;

/**
 * The online mode (EMAIL_MODE=smtp): any SMTP relay, chosen by configuration only. Today it is a
 * Gmail account with an app password, the single sender ADR 0014 allows without a domain; moving to
 * a project account, or another relay, changes `.env` and no code.
 */
export function createSmtpEmailSender(settings: SmtpSettings): EmailSender {
  const transport = createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    requireTLS: !settings.secure,
    auth: { user: settings.user, pass: settings.password },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });

  return {
    async send({ to, subject, text, html }) {
      try {
        await transport.sendMail({ from: settings.from, to, subject, text, html });
        return { sent: true };
      } catch (error) {
        return { sent: false, reason: error instanceof Error ? error.message : 'send failed' };
      }
    },
  };
}
