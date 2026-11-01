/** The platform's own settings: its contact's channels as the site shows them, and the admin's cards. */
export const PLATFORM_SETTINGS = {
  /** Each channel's word, before its value. */
  contact: {
    whatsapp: 'WhatsApp',
    email: 'Email',
  },
  /** The admin's «إعدادات المنصة» (screen 32): three cards, each read and saved on its own. */
  admin: {
    save: 'Save',
    discard: 'Discard changes',
    unsaved: 'Unsaved changes',
    saved: 'Settings saved',
    loadFailed: ({ card }: { card: string }) => `Couldn’t load “${card}”`,
    saveFailed: ({ card }: { card: string }) => `Couldn’t save “${card}”`,
    contact: {
      title: 'Platform contact',
      description: 'Shown in «About Masaha» and «Contact us».',
      email: 'Email',
      whatsapp: 'WhatsApp',
      placeholder: '+970 59 000 0000',
      helper: 'Leave it empty to hide it from the site.',
      errors: {
        email: { invalid_format: 'Enter a valid email' },
        whatsapp: { invalid_format: 'Not a valid number, e.g. +970 59 000 0000' },
      },
    },
    staleness: {
      title: 'Data freshness',
      description:
        'After this visitors see «may have changed», or the price is hidden on unverified spaces.',
      prices: 'Prices (days)',
      other: 'Other data (days)',
      errors: {
        required: 'Enter the number of days',
        out_of_range: 'From 1 to 365 days',
        invalid_format: 'A whole number of days',
      },
    },
    defaults: {
      title: 'Defaults for new spaces',
      description: 'Each owner can change them later in their space settings.',
      autoCheckout: 'Automatic check-out at closing',
      rounding: 'Visit rounding',
      upAfter: 'Round up after a number of minutes',
      minutes: 'After (minutes)',
      half: 'To the nearest half hour',
      minute: 'By the minute',
      cap: 'Never more than the day price',
    },
  },
} as const;
