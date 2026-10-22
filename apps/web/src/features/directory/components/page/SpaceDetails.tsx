import { Badge, Button, cn, EmptyState } from '@shared/design-system';
import { useCopy } from '@shared/copy';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useSpacePage } from '../../hooks/page/useSpacePage';
import { useGallery } from '../../hooks/page/useGallery';
import type { DirectorySlots } from '../../types/DirectorySlots';
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
 * A space's public page (screen 3), in U8's order at every width: the head, an unverified space's
 * notice, the status (a card below 1024 px), the prices, the hours, the amenities, about the space,
 * the location and the contacts (a section below 1024 px). From 1024 px the status and the contacts
 * are a named aside beside the sections; below 768 px a bar at the foot offers WhatsApp and a call.
 * The page sets the area's name, the link back to the directory and the platform's contact.
 */
export function SpaceDetails({
  slug,
  areaName,
  browseLink,
  ownerContact,
}: {
  slug: string;
  areaName: DirectorySlots['areaName'];
  browseLink: string;
  /** The platform's contact, in the unverified notice's dialog. */
  ownerContact: ReactNode;
}) {
  const copy = useCopy();
  const view = useSpacePage(slug);
  const gallery = useGallery(view.photos, view.header?.name.text ?? '');

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
      <div className="flex min-w-0 flex-col gap-10 lg:col-span-8">
        <Gallery gallery={gallery} />
        <SpaceHeader header={view.header} areaName={areaName(view.header.areaId)} />
        {view.unverified !== null && (
          <UnverifiedNotice unverified={view.unverified} ownerContact={ownerContact} />
        )}
        {!view.wide && panelShown && <StatusPanel panel={panel} />}
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
