import {
  platformContactSchema,
  type PlatformContact,
  type PlatformContactRequest,
} from '@masaha/shared/platform-settings';
import { useCopy } from '@shared/copy';
import { createPlatformSettingsRepository } from '../../repository/platformSettingsRepository';
import { useAdminSettingsForm } from './useAdminSettingsForm';

const repository = createPlatformSettingsRepository();

type ContactValues = { email: string; whatsapp: string };

const contactValues = (contact: PlatformContact): ContactValues => ({
  email: contact.email ?? '',
  whatsapp: contact.whatsapp ?? '',
});

/** A channel left empty is sent `null`, which takes it off the site. */
const contactInput = ({ email, whatsapp }: ContactValues) => ({
  email: email.trim() === '' ? null : email.trim(),
  whatsapp: whatsapp.trim() === '' ? null : whatsapp.trim(),
});

/**
 * «التواصل مع المنصة», ready to render: the email and the WhatsApp number, each optional — left
 * empty, `null`, hidden from the site —, refused in the card's words when not valid. The answer is
 * the contact as saved, in its one form (the email lowercased, the number in E.164).
 */
export function useContactCard(saved: PlatformContact) {
  const words = useCopy().platformSettings.admin.contact;
  const { frame, form } = useAdminSettingsForm<
    ContactValues,
    PlatformContactRequest,
    PlatformContact
  >({
    card: 'contact',
    title: words.title,
    description: words.description,
    saved,
    valuesOf: contactValues,
    schema: platformContactSchema,
    fields: ['email', 'whatsapp'],
    prepare: contactInput,
    fieldLines: words.errors,
    save: (request) => repository.saveContact(request),
  });

  return {
    frame,
    email: { label: words.email, binding: form.field('email'), error: form.errors.email },
    whatsapp: {
      label: words.whatsapp,
      placeholder: words.placeholder,
      binding: form.field('whatsapp'),
      error: form.errors.whatsapp,
    },
    helper: words.helper,
  };
}
