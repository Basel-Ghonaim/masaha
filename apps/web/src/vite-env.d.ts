/** The web's build-time settings (apps/web/.env.example; docs/development/setup.md › The web). */
interface ImportMetaEnv {
  /** Masaha's Google client id, the same as the API's `GOOGLE_CLIENT_ID`; without it, no Google sign-in. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** The platform's contact email, on About and to an unverified space's owner; without it, not shown. */
  readonly VITE_CONTACT_EMAIL?: string;
  /** The platform's WhatsApp number, as the email; without it, not shown. */
  readonly VITE_CONTACT_WHATSAPP?: string;
}
