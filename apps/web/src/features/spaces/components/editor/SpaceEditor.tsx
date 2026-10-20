import { Alert, AlertDescription, AlertTitle } from '@shared/design-system';
import { ForbiddenState, NotFoundState } from '@shared/routing';
import { useRef } from 'react';
import { useSpaceEditor } from '../../hooks/editor/useSpaceEditor';
import type { AmenitiesField } from '../../types/AmenitiesField';
import type { AreaField } from '../../types/AreaField';
import type { AdminPlace, OwnerPlace } from '../../types/EditorPlace';
import { AmenitiesSection } from '../amenities/AmenitiesSection';
import { ReadOnlyAmenities } from '../amenities/ReadOnlyAmenities';
import { ContactsSection } from '../contacts/ContactsSection';
import { ReadOnlyContacts } from '../contacts/ReadOnlyContacts';
import { HoursSection } from '../hours/HoursSection';
import { ReadOnlyHours } from '../hours/ReadOnlyHours';
import { PhotosSection } from '../photos/PhotosSection';
import { ReadOnlyPhotos } from '../photos/ReadOnlyPhotos';
import { PricesSection } from '../prices/PricesSection';
import { ReadOnlyPrices } from '../prices/ReadOnlyPrices';
import { ProfileSection } from '../profile/ProfileSection';
import { ReadOnlyProfile } from '../profile/ReadOnlyProfile';
import { EditorFailure } from './EditorFailure';
import { EditorLoading } from './EditorLoading';
import { LeaveDialog } from './LeaveDialog';
import { MissingChecklist } from './MissingChecklist';
import { OwnerHead } from './OwnerHead';
import { PricesLinkCard } from './PricesLinkCard';
import { PrivacyNote } from './PrivacyNote';
import { SectionNav } from './SectionNav';
import { SpaceStatusBadges } from './SpaceStatusBadges';
import { VerifiedNotice } from './VerifiedNotice';

/**
 * A space's editor, the admin's or an owner's (`place`): its state, then its sections, each fact
 * group saved, dated and confirmed alone, with the groups still missing at their head and their
 * navigation beside them; a space the place may not edit, read-only. It shows its own loading,
 * failure and not-found states, and asks before the page is left with unsaved changes. On an
 * owner's place it has no notice: a head line with the public page instead, its prices a row that
 * leads to Packages & prices (`pricesLink`), and no way to the platform's amenities list.
 *
 * The page fills what comes from elsewhere: the area field and the amenities' checklist
 * (`lookups`), and the space's page on the public site (`publicLink`, by its slug). The admin's place
 * adds the area's and the amenities' names for a verified space, the way to the platform's amenities
 * list, and the owners' actions in its notice (`ownerActions`, from `space-links`): an unlink per
 * owner of a verified space, the link on an unverified one.
 */
export function SpaceEditor({
  spaceId,
  place,
  areaField,
  amenitiesField,
  publicLink,
}: {
  spaceId: number;
  place: AdminPlace | OwnerPlace;
  areaField: AreaField;
  amenitiesField: AmenitiesField;
  publicLink: (slug: string) => string;
}) {
  const editor = useSpaceEditor(place.kind, spaceId);
  // The notice stays while its content is swapped, so it takes the focus a link or an unlink leaves.
  const notice = useRef<HTMLDivElement>(null);

  if (editor.state === 'loading') return <EditorLoading label={editor.label} />;
  if (editor.state === 'notFound') return <NotFoundState />;
  if (editor.state === 'failed') {
    return <EditorFailure message={editor.message} retry={editor.retry} />;
  }

  // An owner's link is what verifies a space, so an owner is never shown one they may not edit.
  if (editor.readOnly && place.kind === 'owner') return <ForbiddenState />;

  const { space } = editor;
  const sectionPlace = place.kind;
  return (
    <div className="flex flex-col gap-4">
      {editor.badges.length > 0 && <SpaceStatusBadges badges={editor.badges} />}
      {editor.head && (
        <OwnerHead
          intro={editor.head.intro}
          publicLink={{ label: editor.head.viewPublic, href: publicLink(space.slug) }}
        />
      )}
      {place.kind === 'admin' && editor.notice && (
        <div ref={notice} tabIndex={-1} className="outline-none">
          {editor.readOnly ? (
            <VerifiedNotice words={editor.notice.verified} publicHref={publicLink(space.slug)}>
              <div className="flex flex-wrap gap-2">
                {place.ownerActions({ ...editor.owned, focusFallback: notice })}
              </div>
            </VerifiedNotice>
          ) : (
            <Alert variant="warning">
              <AlertTitle>{editor.notice.unverified.title}</AlertTitle>
              <AlertDescription>
                <p>{editor.notice.unverified.description}</p>
                <div className="flex flex-wrap gap-2">
                  {place.ownerActions({ ...editor.owned, focusFallback: notice })}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        <SectionNav
          label={editor.navigation.label}
          items={editor.navigation.items}
          wideOnly={editor.readOnly}
        />
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-9">
          {editor.checklist && <MissingChecklist {...editor.checklist} />}
          {editor.readOnly && place.kind === 'admin' ? (
            <>
              <ReadOnlyProfile space={space} areaName={place.areaName} />
              <ReadOnlyHours space={space} />
              <ReadOnlyPrices space={space} />
              <ReadOnlyAmenities space={space} amenityNames={place.amenityNames} />
              <ReadOnlyContacts space={space} />
              <ReadOnlyPhotos place={sectionPlace} spaceId={spaceId} />
            </>
          ) : (
            <>
              <ProfileSection
                place={sectionPlace}
                space={space}
                areaField={areaField}
                onDirtyChange={editor.onDirtyChange}
              />
              <HoursSection
                place={sectionPlace}
                space={space}
                onDirtyChange={editor.onDirtyChange}
              />
              {place.kind === 'owner' && editor.pricesLink ? (
                <PricesLinkCard view={editor.pricesLink} href={place.pricesLink} />
              ) : (
                <PricesSection
                  place={sectionPlace}
                  space={space}
                  hoursUnsaved={editor.hoursUnsaved}
                  hoursLink={null}
                  onDirtyChange={editor.onDirtyChange}
                />
              )}
              <AmenitiesSection
                place={sectionPlace}
                space={space}
                amenitiesField={amenitiesField}
                listLink={place.kind === 'admin' ? place.amenitiesListLink : null}
                onDirtyChange={editor.onDirtyChange}
              />
              <ContactsSection
                place={sectionPlace}
                space={space}
                onDirtyChange={editor.onDirtyChange}
              />
              <PhotosSection
                place={sectionPlace}
                spaceId={spaceId}
                onUploadingChange={editor.onUploadingChange}
              />
            </>
          )}
          {editor.privacy && <PrivacyNote text={editor.privacy} />}
        </div>
      </div>
      <LeaveDialog guard={editor.guard} />
    </div>
  );
}
