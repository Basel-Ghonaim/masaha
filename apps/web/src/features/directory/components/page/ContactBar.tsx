import { Button } from '@shared/design-system';
import type { SpacePageView } from '../../types/SpacePageView';

/**
 * Below 768 px, the bar fixed at the page's foot, a region named «التواصل السريع»: «واتساب»
 * (primary, in a new tab) and «اتصال» (outline), each as wide as it can be.
 */
export function ContactBar({ bar }: { bar: NonNullable<SpacePageView['bar']> }) {
  return (
    <div
      role="region"
      aria-label={bar.label}
      className="fixed inset-x-0 bottom-0 z-sticky flex gap-3 border-t border-border bg-background px-4 py-3"
    >
      {bar.whatsapp !== null && (
        <Button asChild className="flex-1">
          <a href={bar.whatsapp.href} target="_blank" rel="noopener">
            {bar.whatsapp.label}
          </a>
        </Button>
      )}
      {bar.call !== null && (
        <Button asChild variant="outline" className="flex-1">
          <a href={bar.call.href}>{bar.call.label}</a>
        </Button>
      )}
    </div>
  );
}
