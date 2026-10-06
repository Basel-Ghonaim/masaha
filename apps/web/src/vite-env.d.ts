/** The web's build-time settings (apps/web/.env.example; docs/development/setup.md › The web). */
interface ImportMetaEnv {
  /** Masaha's Google client id, the same as the API's `GOOGLE_CLIENT_ID`; without it, no Google sign-in. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}
