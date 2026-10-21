import type { SpaceSettings } from '@masaha/shared/space-settings';
import { Button, Field, Textarea } from '@shared/design-system';
import { useRef } from 'react';
import { useReminderCard } from '../../hooks/reminder/useReminderCard';
import { SettingsCard } from '../SettingsCard';

/**
 * «رسالة التذكير»: the message, «إدراج:» with a button per placeholder, each showing its token and
 * named for what it inserts, then the preview, and «استعادة النص الافتراضي» in the footer. The
 * field takes the direction of what is typed; only the buttons, whose tokens are Arabic, are set
 * right to left.
 */
export function ReminderCard({
  spaceId,
  settings,
  spaceName,
}: {
  spaceId: number;
  settings: SpaceSettings;
  spaceName: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const card = useReminderCard({ spaceId, settings, spaceName, textareaRef });

  return (
    <SettingsCard
      frame={card.frame}
      footer={
        <Button
          type="button"
          variant="ghost"
          disabled={card.restore.disabled}
          onClick={card.restore.run}
        >
          {card.restore.label}
        </Button>
      }
    >
      <Field label={card.text.label} error={card.text.error}>
        <Textarea dir="auto" rows={4} {...card.text.binding} />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body-sm text-muted-foreground">{card.insert.label}</span>
        {card.insert.tokens.map((token) => (
          <Button
            key={token.token}
            type="button"
            variant="outline"
            size="sm"
            dir="rtl"
            aria-label={token.label}
            disabled={card.insert.disabled}
            onClick={() => {
              token.run(textareaRef.current);
            }}
          >
            {token.token}
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-1 rounded-lg bg-muted p-3">
        <span className="text-caption text-muted-foreground">{card.preview.label}</span>
        <p dir="auto" className="text-body-sm whitespace-pre-line text-foreground">
          {card.preview.text}
        </p>
      </div>
    </SettingsCard>
  );
}
