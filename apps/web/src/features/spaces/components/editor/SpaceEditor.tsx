import { Alert, AlertDescription, AlertTitle } from '@shared/design-system';
import { NotFoundState } from '@shared/routing';
import { useRef, type ReactNode } from 'react';
import { useSpaceEditor } from '../../hooks/editor/useSpaceEditor';
import type { AmenitiesField } from '../../types/AmenitiesField';
import type { AreaField } from '../../types/AreaField';
import type { OwnersSlot } from '../../types/OwnersSlot';
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
import { PrivacyNote } from './PrivacyNote';
import { SectionNav } from './SectionNav';
import { SpaceStatusBadges } from './SpaceStatusBadges';
import { VerifiedNotice } from './VerifiedNotice';

/**
 * A space's editor, with no interface only the admin's page uses: its state, then its sections, each fact
 * group saved, dated and confirmed alone, with the groups still missing at their head and their
 * navigation beside them; a verified space's values, read-only. It shows its own loading, failure
 * and not-found states, and asks before the page is left with unsaved changes.
 *
 * The page fills what comes from elsewhere: the area field and the area's name, the amenities'
 * checklist and their names (`lookups`), the way to the platform's amenities list (`amenitiesListLink`),
 * the space's page on the public site (`publicLink`, by its slug), and the owners' actions in its
 * notice (`ownerActions`, from `space-links`): an unlink per owner of a verified space, the link on an
 * unverified one.
 */
export function SpaceEditor({
  spaceId,
  areaField,
  areaName,
  amenitiesField,
  amenityNames,
  amenitiesListLink,
  publicLink,
  ownerActions,
}: {
  spaceId: number;
  areaField: AreaField;
  areaName: (areaId: number) => ReactNode;
  amenitiesField: AmenitiesField;
  amenityNames: (ids: number[]) => ReactNode;
  amenitiesListLink: string;
  publicLink: (slug: string) => string;
  ownerActions: OwnersSlot;
}) {
  const editor = useSpaceEditor(spaceId);
  // The notice stays while its content is swapped, so it takes the focus a link or an unlink leaves.
  const notice = useRef<HTMLDivElement>(null);

  if (editor.state === 'loading') return <EditorLoading label={editor.label} />;
  if (editor.state === 'notFound') return <NotFoundState />;
  if (editor.state === 'failed') {
    return <EditorFailure message={editor.message} retry={editor.retry} />;
  }

  const { space } = editor;
  return (
    <div className="flex flex-col gap-4">
      <SpaceStatusBadges badges={editor.badges} />
      <div ref={notice} tabIndex={-1} className="outline-none">
        {editor.readOnly ? (
          <VerifiedNotice words={editor.verified} publicHref={publicLink(space.slug)}>
            <div className="flex flex-wrap gap-2">
              {ownerActions({ ...editor.owned, focusFallback: notice })}
            </div>
          </VerifiedNotice>
        ) : (
          <Alert variant="warning">
            <AlertTitle>{editor.unverified.title}</AlertTitle>
            <AlertDescription>
              <p>{editor.unverified.description}</p>
              <div className="flex flex-wrap gap-2">
                {ownerActions({ ...editor.owned, focusFallback: notice })}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        <SectionNav
          label={editor.navigation.label}
          items={editor.navigation.items}
          wideOnly={editor.readOnly}
        />
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-9">
          {editor.checklist && <MissingChecklist {...editor.checklist} />}
          {editor.readOnly ? (
            <>
              <ReadOnlyProfile space={space} areaName={areaName} />
              <ReadOnlyHours space={space} />
              <ReadOnlyPrices space={space} />
              <ReadOnlyAmenities space={space} amenityNames={amenityNames} />
              <ReadOnlyContacts space={space} />
              <ReadOnlyPhotos spaceId={spaceId} />
            </>
          ) : (
            <>
              <ProfileSection
                space={space}
                areaField={areaField}
                onDirtyChange={editor.onDirtyChange}
              />
              <HoursSection space={space} onDirtyChange={editor.onDirtyChange} />
              <PricesSection
                space={space}
                hoursUnsaved={editor.hoursUnsaved}
                onDirtyChange={editor.onDirtyChange}
              />
              <AmenitiesSection
                space={space}
                amenitiesField={amenitiesField}
                listLink={amenitiesListLink}
                onDirtyChange={editor.onDirtyChange}
              />
              <ContactsSection space={space} onDirtyChange={editor.onDirtyChange} />
              <PhotosSection spaceId={spaceId} onUploadingChange={editor.onUploadingChange} />
            </>
          )}
          <PrivacyNote text={editor.privacy} />
        </div>
      </div>
      <LeaveDialog guard={editor.guard} />
    </div>
  );
}
