// The part of Google Identity Services' `google.accounts.id` that the sign-in uses, as Google's
// script defines it on the page (https://developers.google.com/identity/gsi/web/reference/js-reference).

/** What Google hands back once the person has chosen their account: the ID token. */
export type GoogleCredentialResponse = { credential?: string };

/** How Google's own button looks. */
export type GoogleButtonOptions = {
  type: 'standard';
  theme: 'outline' | 'filled_black';
  size: 'large';
  text: 'continue_with';
  shape: 'rectangular';
  logo_alignment: 'center';
  /** The interface's language. */
  locale: string;
  /** In pixels; Google renders between 200 and 400. */
  width?: number;
};

export type GoogleIdentity = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode: 'popup';
    auto_select: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
};
