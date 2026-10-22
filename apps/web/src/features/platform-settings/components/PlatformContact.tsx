import { useCopy } from '@shared/copy';
import { Button, cn } from '@shared/design-system';
import type { ReactNode } from 'react';
import { platformContact } from '../services/platformContact';

/**
 * The platform's contact, each configured channel a link styled as a button, the first primary
 * and the rest outline: its word, then its value left to right (muted on outline). WhatsApp opens
 * in a new tab; the email does not. A row from 768 px (`row`) or a column (`column`); with no
 * channel configured, `none`, or nothing.
 */
export function PlatformContact({
  layout,
  none = null,
}: {
  layout: 'row' | 'column';
  none?: ReactNode;
}) {
  const words = useCopy().platformSettings.contact;
  const channels = platformContact();
  if (channels.length === 0) return none;

  return (
    <div className={cn('flex flex-col gap-3', layout === 'row' && 'md:flex-row md:flex-wrap')}>
      {channels.map((channel, index) => (
        <Button key={channel.kind} asChild variant={index === 0 ? 'primary' : 'outline'}>
          <a
            href={channel.href}
            {...(channel.kind === 'whatsapp' && { target: '_blank', rel: 'noopener' })}
          >
            <span>{words[channel.kind]}</span>{' '}
            <span dir="ltr" className={cn(index > 0 && 'text-muted-foreground')}>
              {channel.value}
            </span>
          </a>
        </Button>
      ))}
    </div>
  );
}
