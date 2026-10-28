import type { PublicAnnouncement } from '@masaha/shared/directory';
import { Badge, Button, cn, EmptyState } from '@shared/design-system';
import { useCopy } from '@shared/copy';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useFavoriteIds } from '../../hooks/favorites/useFavoriteIds';
import { useSpacePage } from '../../hooks/page/useSpacePage';
import { useGallery } from '../../hooks/page/useGallery';
import type { ActionSpace, DirectorySlots } from '../../types/DirectorySlots';
import type { SlotSpace } from '../../types/SpacePageView';
import { FailureAlert } from '../list/FailureAlert';
import { AboutSection } from './AboutSection';
import { AmenitiesSection } from './AmenitiesSection';
import { ContactBar } from './ContactBar';
import { ContactList } from './ContactList';
import { HoursSection } from './HoursSection';
import { Gallery } from './Gallery';
import { LocationSection } from './LocationSection';
import { PageSkeleton } from './PageSkeleton';
import { PricesSection } from './PricesSection';
import { Section } from './Section';
import { SpaceHeader } from './SpaceHeader';
import { StatusPanel } from './StatusPanel';
import { UnverifiedNotice } from './UnverifiedNotice';

/**
 * A space's public page (screen 3), in U8's order at every width: a running closure's notice at the
 * top, the head, an unverified space's notice, the status (a card below 1024 px), the space's
 * announcements, the prices, the hours, the amenities, about the space,
 * the location and the contacts (a section below 1024 px). From 1024 px the status and the contacts
 * are a named aside beside the sections; below 768 px a bar at the foot offers WhatsApp and a call.
 * The page sets the area's name, the link back to the directory and the platform's contact, the
 * heart beside the name, the closure's notice and the announcements, and the report of wrong
 * information, drawn last in the main column (U8).
 */
export function SpaceDetails({
  slug,
  areaName,
  browseLink,
  ownerContact,
  heart,
  notice,
  announcements,
  report,
}: {
  slug: string;
  areaName: DirectorySlots['areaName'];
  browseLink: string;
  /** The platform's contact, in the unverified notice's dialog. */
  ownerContact: ReactNode;
  /** The favourite's heart, beside the space's name, told whether the user saved it. */
  heart?: (space: ActionSpace) => ReactNode;
  /** A running closure's notice, above the page (U8: «the closure Alert stays at the top»). */
  notice?: (items: PublicAnnouncement[]) => ReactNode;
  /** The space's announcements, after the status and before the prices (U8). */
  announcements?: (items: PublicAnnouncement[]) => ReactNode;
  /** The report of the space's wrong information, at the end of its sections. */
  report?: (space: SlotSpace) => ReactNode;
}) {
  const copy = useCopy();
  const view = useSpacePage(slug);
  const gallery = useGallery(view.photos, view.header?.name.text ?? '');
  const saved = useFavoriteIds();

  if (view.state === 'loading')
    return (
      <>
        <h1 className="sr-only">{copy.site.links.space}</h1>
        <PageSkeleton />
      </>
    );
  if (view.state === 'notFound')
    return (
      <EmptyState titleAs="h1" title={view.notFound.title} description={view.notFound.text}>
        <Button asChild>
          <Link to={browseLink}>{view.notFound.browse}</Link>
        </Button>
      </EmptyState>
    );
  if (view.state === 'failed' || view.header === null)
    return view.failure === null ? null : (
      <>
        <h1 className="sr-only">{copy.site.links.space}</h1>
        <FailureAlert failure={view.failure} />
      </>
    );

  const { panel, contacts, bar } = view;
  const panelShown = panel.today !== null || panel.distance !== null;
  const withBar = view.phone && bar !== null;

  return (
    <div
      className={cn(
        'flex flex-col gap-10 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8',
        withBar && 'pb-24 md:pb-0',
      )}
    >
      {notice !== undefined && (
        // Empty when no closure runs: hidden, so it takes no gap.
        <div className="empty:hidden lg:col-span-12">{notice(view.announcements)}</div>
      )}
      <div className="flex min-w-0 flex-col gap-10 lg:col-span-8">
        <Gallery gallery={gallery} />
        <SpaceHeader
          header={view.header}
          areaName={areaName(view.header.areaId)}
          action={
            heart === undefined || view.space === null
              ? undefined
              : heart({
                  id: view.space.id,
                  name: view.space.name,
                  saved: saved?.has(view.space.id) ?? false,
                })
          }
        />
        {view.unverified !== null && (
          <UnverifiedNotice unverified={view.unverified} ownerContact={ownerContact} />
        )}
        {!view.wide && panelShown && <StatusPanel panel={panel} />}
        {announcements?.(view.announcements)}
        <PricesSection prices={view.prices} />
        <HoursSection hours={view.hours} />
        {view.amenities !== null && <AmenitiesSection amenities={view.amenities} />}
        {view.about !== null && <AboutSection about={view.about} />}
        <LocationSection location={view.location} />
        {!view.wide && contacts !== null && (
          <Section title={contacts.title} meta={contacts.meta}>
            <ContactList items={contacts.items} />
          </Section>
        )}
        {report !== undefined && view.space !== null && (
          <div className="border-t border-border pt-6">{report(view.space)}</div>
        )}
      </div>
      {view.wide && (panelShown || contacts !== null) && (
        <aside aria-label={panel.title} className="flex flex-col gap-4 lg:col-span-4">
          <StatusPanel panel={panel}>
            {contacts !== null && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                  {contacts.meta.lines.length > 0 && <p>{contacts.meta.lines.join(' · ')}</p>}
                  {contacts.meta.stale !== null && (
                    <Badge variant="warning">{contacts.meta.stale}</Badge>
                  )}
                </div>
                <ContactList items={contacts.items} />
              </div>
            )}
          </StatusPanel>
        </aside>
      )}
      {withBar && <ContactBar bar={bar} />}
    </div>
  );
}
