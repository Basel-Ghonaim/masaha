# 19. The reset email's colours, fonts and styles are written outside the design system

**Status:** Accepted · **Date:** 2026-10-01 · **Corrected:** 2026-10-02 · **Accepted:** 2026-10-03

**Evidence:** the reset email (`apps/api/src/modules/auth/email/resetEmail.ts`) writes its styles inline, copied from its design (`docs/design/prototype/Reset email.html`): seven colours as literal values, two font stacks, and every layout rule (sizes, spacing, borders, radii). The design system is the one place for colours, fonts and CSS, as semantic tokens ([foundation](../../frontend/design-system/foundation.md)), but an email client reads no stylesheet and no custom property, and the API cannot import the web's tokens.

**Resolves when:** the owner accepts the deviation (the email is the only one Masaha sends, and its colours and fonts are named in one place), with design-system changes of the brand, neutral colours or fonts carried to it by hand; or the email is generated from the tokens at build time.

**Resolution (2026-10-03):** the owner accepted the deviation as widened: the email is the only one Masaha sends, and its colours and fonts are named in one place in `resetEmail.ts`. A design-system change of the brand or neutral colours, or of the fonts, is carried to it by hand.
