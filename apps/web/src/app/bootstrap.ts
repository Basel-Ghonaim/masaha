import { CATALOGUES } from '@shared/copy';
import { documentLanguage, setupLocalisation } from '@shared/localisation';

/** Wires the platform before the first render. */
export function bootstrap(): void {
  // The language is read from <html lang>, where the pre-paint script resolved it, until the
  // preferences store replaces this source (docs/frontend/localisation.md#catalogues).
  setupLocalisation({ catalogues: CATALOGUES, language: documentLanguage });
}
