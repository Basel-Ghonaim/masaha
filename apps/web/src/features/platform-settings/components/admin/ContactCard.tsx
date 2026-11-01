import type { PlatformContact } from '@masaha/shared/platform-settings';
import { Field, Input } from '@shared/design-system';
import { useContactCard } from '../../hooks/admin/useContactCard';
import { SettingsCardShell } from './SettingsCardShell';

/** «التواصل مع المنصة»: the email and the WhatsApp number, left to right, each optional. */
export function ContactCard({ saved }: { saved: PlatformContact }) {
  const card = useContactCard(saved);
  return (
    <SettingsCardShell frame={card.frame}>
      <Field label={card.email.label} helper={card.helper} error={card.email.error}>
        <Input type="email" dir="ltr" autoComplete="off" {...card.email.binding} />
      </Field>
      <Field label={card.whatsapp.label} helper={card.helper} error={card.whatsapp.error}>
        <Input
          type="tel"
          dir="ltr"
          autoComplete="off"
          placeholder={card.whatsapp.placeholder}
          {...card.whatsapp.binding}
        />
      </Field>
    </SettingsCardShell>
  );
}
