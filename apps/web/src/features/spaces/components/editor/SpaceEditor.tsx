import { ForbiddenState, NotFoundState } from '@shared/routing';
import { spaceNameOf } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useCopy } from '@shared/copy';
import { useRef, useState, type ReactNode } from 'react';
import { useHashLanding } from '../../hooks/editor/useHashLanding';
import { useProfileHeader } from '../../hooks/editor/useProfileHeader';
import { useSpaceEditor } from '../../hooks/editor/useSpaceEditor';
import type { AmenitiesField } from '../../types/AmenitiesField';
import type { AmenityCatalogue } from '../../types/AmenityCatalogue';
import type { AreaField } from '../../types/AreaField';
import type { AreaLine } from '../../types/AreaLine';
import type { AdminPlace, OwnerPlace } from '../../types/EditorPlace';
import type { SectionHost } from '../../types/SectionHost';
import type { SectionId } from '../../types/SectionId';
import { AboutSection } from '../about/AboutSection';
import { AmenitiesSection } from '../amenities/AmenitiesSection';
import { ContactsSection } from '../contacts/ContactsSection';
import { HoursSection } from '../hours/HoursSection';
import { LocationSection } from '../location/LocationSection';
import { PhotosSection } from '../photos/PhotosSection';
import { PricesSection } from '../prices/PricesSection';
import { ShiftsSection } from '../shifts/ShiftsSection';
import { EditorFailure } from './EditorFailure';
import { EditorLoading } from './EditorLoading';
import { LeaveDialog } from './LeaveDialog';
import { PrivacyNote } from './PrivacyNote';
import { ProfileHeader } from './ProfileHeader';
import { SectionIndex } from './SectionIndex';
import { VerifiedNotice } from './VerifiedNotice';

/**
 * A space's profile, the owner's «ملف المساحة» and the admin's space editor alike (G1–G5): one page
 * read as a visitor sees it — the header, a summary, then the eight sections in the public page's
 * order, the index beside them from 1024 px — each section edited in a Sheet of its own, the photos
 * in place. It shows its own loading, failure and not-found states, and asks before the page is left
 * with a Sheet's changes or a photo still travelling.
 *
 * The page fills what comes from elsewhere: the area's field and line, the amenities' checklist and
 * catalogue (`lookups`), and the space's public page (`publicLink`). The admin's place adds the
 * owners' actions (`space-links`) — the unlink of a verified space's owners in its notice, an
 * unverified space's link in the header (DI-3) — and the way to the platform's amenities list; the
 * owner's, the way to a closure announcement and the shifts its packages use. A page may set a notice
 * inside a section (`noticeFor`), such as an open report's (`data-reports`). Once drawn, the page lands
 * on the section the address's hash names (184).
 */
export function SpaceEditor({
  spaceId,
  place,
  areaField,
  areaLine,
  amenitiesField,
  amenityCatalogue,
  publicLink,
  noticeFor,
}: {
  spaceId: number;
  place: AdminPlace | OwnerPlace;
  areaField: AreaField;
  areaLine: AreaLine;
  amenitiesField: AmenitiesField;
  amenityCatalogue: AmenityCatalogue;
  publicLink: (slug: string) => string;
  /** What the page sets inside a section, if anything. */
  noticeFor?: (section: SectionId) => ReactNode;
}) {
  const editor = useSpaceEditor(place.kind, spaceId);
  useHashLanding(editor.state === 'ready');

  if (editor.state === 'loading') return <EditorLoading label={editor.label} />;
  if (editor.state === 'notFound') return <NotFoundState />;
  if (editor.state === 'failed') {
    return <EditorFailure message={editor.message} retry={editor.retry} />;
  }
  if (editor.state === 'forbidden') return <ForbiddenState />;

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
      <SectionIndex label={editor.index.label} items={editor.index.items} />
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-9">
        <EditorBody
          editor={editor}
          place={place}
          areaField={areaField}
          areaLine={areaLine}
          amenitiesField={amenitiesField}
          amenityCatalogue={amenityCatalogue}
          publicLink={publicLink}
          noticeFor={noticeFor}
        />
      </div>
      <LeaveDialog guard={editor.guard} />
    </div>
  );
}

type ReadyEditor = Extract<ReturnType<typeof useSpaceEditor>, { state: 'ready' }>;

/** The ready profile: the header, the admin's notice of a verified space, and the eight sections. */
function EditorBody({
  editor,
  place,
  areaField,
  areaLine,
  amenitiesField,
  amenityCatalogue,
  publicLink,
  noticeFor,
}: {
  editor: ReadyEditor;
  place: AdminPlace | OwnerPlace;
  areaField: AreaField;
  areaLine: AreaLine;
  amenitiesField: AmenitiesField;
  amenityCatalogue: AmenityCatalogue;
  publicLink: (slug: string) => string;
  noticeFor?: (section: SectionId) => ReactNode;
}) {
  const copy = useCopy();
  const english = useLanguage() === 'en';
  const { space, editable } = editor;
  // Changes each time the header's «أضف صورة غلاف» asks for «اختر صورًا».
  const [coverRequest, setCoverRequest] = useState(0);
  // The owners' actions swap their content; this stays and takes the focus they leave.
  const owners = useRef<HTMLDivElement>(null);
  const header = useProfileHeader({
    place: place.kind,
    space,
    photos: editor.photos,
    completeness: editor.completeness,
    galleryRetry: editor.galleryRetry,
    publicHref: publicLink(space.slug),
    editable,
    addCover: () => {
      editor.photosEditing.set(true);
      setCoverRequest((count) => count + 1);
    },
  });
  const owned = {
    id: space.id,
    name: spaceNameOf(space, english),
    isVerified: space.isVerified,
    owners: space.owners,
    focusFallback: owners,
  };
  const host = (section: SectionId): SectionHost => ({
    place: place.kind,
    space,
    editable,
    notice: noticeFor?.(section) ?? null,
    sheet: editor.sheetHost,
    openSheet: editor.openSheet,
  });
  const verified = copy.spaces.editor.verified;

  return (
    <>
      <ProfileHeader
        view={header}
        areaLine={areaLine(space.areaId)}
        actions={
          place.kind === 'admin' && !space.isVerified ? (
            // DI-3: an unverified space's «ربط مالك», beside «غير موثّقة».
            <div ref={owners} tabIndex={-1} className="flex flex-wrap gap-2 outline-none">
              {place.ownerActions(owned)}
            </div>
          ) : undefined
        }
      />
      {place.kind === 'admin' && space.isVerified && (
        <div ref={owners} tabIndex={-1} className="outline-none">
          <VerifiedNotice
            words={{
              // Each name isolated, so a name in one direction never reorders its neighbours.
              title: verified.ownedBy({
                names: space.owners.map(({ name }) => isolate(name)).join(verified.namesSeparator),
              }),
              description: verified.description,
              viewOnSite: verified.viewOnSite,
              correct: verified.correct,
            }}
            publicHref={publicLink(space.slug)}
            reports={{
              label: verified.reports({ space: isolate(spaceNameOf(space, english).text) }),
              href: place.reportsLink(space.id),
            }}
          >
            <div className="flex flex-wrap gap-2">{place.ownerActions(owned)}</div>
          </VerifiedNotice>
        </div>
      )}
      <PhotosSection
        place={place.kind}
        spaceId={space.id}
        editable={editable}
        editing={editor.photosEditing}
        focusRequest={coverRequest}
        onUploadingChange={editor.onUploadingChange}
      />
      <PricesSection host={host('prices')} />
      <HoursSection
        host={host('hours')}
        closureLink={place.kind === 'owner' ? place.closureLink : null}
      />
      <ShiftsSection
        host={host('shifts')}
        packageShifts={place.kind === 'owner' ? place.packageShifts : []}
      />
      <AmenitiesSection
        host={host('amenities')}
        amenitiesField={amenitiesField}
        catalogue={amenityCatalogue}
        listLink={place.kind === 'admin' ? place.amenitiesListLink : null}
      />
      <AboutSection host={host('about')} />
      <LocationSection host={host('location')} areaLine={areaLine} areaField={areaField} />
      <ContactsSection host={host('contacts')} />
      {editor.privacy && <PrivacyNote text={editor.privacy} />}
    </>
  );
}
