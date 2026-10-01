import type { Logger } from 'pino';

import type { EmailSender } from './emailSender.ts';

/**
 * The development mode (EMAIL_MODE=log): nothing is sent, and the message's text, with its link, is
 * written to the log instead. The text holds a single-use secret, so the environment allows this
 * mode in development only (config/env.ts).
 */
export function createLogEmailSender(logger: Logger): EmailSender {
  return {
    send(message) {
      logger.info(
        { email: { to: message.to, subject: message.subject } },
        `[email:log] not sent, development only:\n${message.text}`,
      );
      return Promise.resolve({ sent: true });
    },
  };
}
