import { useCopy } from '@shared/copy';
import { useIsMutating } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { headingIdOf } from '../../components/editor/SectionCard';
import { completenessOf } from '../../services/completeness';
import { mayEdit } from '../../services/mayEdit';
import type { EditorPlace } from '../../types/EditorPlace';
import { SECTION_IDS, isSheetId, type SectionId, type SheetId } from '../../types/SectionId';
import type { SheetHost } from '../../types/SheetHost';
import { usePhotosQuery } from '../photos/usePhotosQuery';
import { EDITOR_SCOPES } from './editorScope';
import { sectionName } from './sectionName';
import { useLeaveGuard } from './useLeaveGuard';
import { useSectionInView } from './useSectionInView';
import { useSpaceQuery } from './useSpaceQuery';

/**
 * A space's profile at `place`, ready to render: its loading, failure and not-found states, and the
 * 403 of a space an owner may not edit, since an owner's link is what verifies one; whether
 * the place may edit it (`mayEdit`); the Sheets — one open at a time, opened by its section's
 * «تعديل» or an address's `?sheet=` once the page has drawn (the parameter then removed, so Back and
 * a reload never reopen it), the focus given back on closing to what opened it, or to its section's
 * heading when that is gone; the photos' edit state, opened in place (P2); each section's state for
 * the header's completeness and the index, which waits for the gallery (DI-4); the section in view;
 * and the guard that asks before the page is left with a Sheet's changes or a photo still uploading,
 * only while the profile is drawn. A space found deleted is the 404, whatever was read before; a Sheet
 * whose section can no longer be edited — the space deleted or verified meanwhile — goes, its changes
 * with it, the focus given to its section's heading when it is still there.
 */
export function useSpaceEditor(place: EditorPlace, spaceId: number) {
  const copy = useCopy();
  const query = useSpaceQuery(place, spaceId);
  const photos = usePhotosQuery(place, spaceId);
  const [sheet, setSheet] = useState<SheetId | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editingPhotos, setEditingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  // What opened the Sheet that is open: the focus goes back to it once the Sheet has closed.
  const opener = useRef<HTMLElement | null>(null);
  const saving = useIsMutating({ mutationKey: EDITOR_SCOPES[place].writeKey(spaceId) }) > 0;
  const space = query.data;
  const gone = query.error?.status === 404;
  const editable = space !== undefined && mayEdit(place, space.isVerified);
  const forbidden = space !== undefined && !editable && place === 'owner';
  // A Sheet whose section can no longer be edited goes, and its changes with it: none could be saved.
  if (sheet !== null && (gone || !editable)) {
    setSheet(null);
    setDirty(false);
  }
  // Only the drawn profile has anything to lose; its other states draw no dialog to ask with.
  const drawn = space !== undefined && !gone && !forbidden;
  const guard = useLeaveGuard(
    drawn && sheet !== null && dirty ? sectionName(sheet, copy) : null,
    saving,
    drawn && uploading,
  );
  // The Sheet open now, for a closed one giving the focus back once the editor has drawn after it.
  const openNow = useRef(sheet);
  useEffect(() => {
    openNow.current = sheet;
  });
  const inView = useSectionInView(
    space === undefined ? [] : SECTION_IDS,
    editable ? 'edit' : 'read',
  );
  const location = useLocation();
  const navigate = useNavigate();
  const asked = new URLSearchParams(location.search).get('sheet');

  const openSheet = useCallback((section: SheetId) => {
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setDirty(false);
    setSheet(section);
  }, []);

  // `?sheet=` opens that Sheet once the page has drawn, then leaves the address (OD3): read once.
  const ready = space !== undefined;
  const [linked, setLinked] = useState(false);
  if (ready && asked !== null && !linked) {
    setLinked(true);
    if (editable && isSheetId(asked)) setSheet(asked);
  }
  const { search, hash } = location;
  useEffect(() => {
    if (!ready || asked === null) return;
    const next = new URLSearchParams(search);
    next.delete('sheet');
    // Its hash stays, so the page still lands on the section.
    void navigate(
      { search: next.size === 0 ? '' : `?${next.toString()}`, hash },
      { replace: true, preventScrollReset: true },
    );
  }, [ready, asked, search, hash, navigate]);

  const hostOf = useCallback(
    (section: SheetId): SheetHost => ({
      open: sheet === section,
      close: () => {
        setSheet((current) => (current === section ? null : current));
        setDirty(false);
      },
      returnFocus: () => {
        // Another Sheet opened from this one keeps the focus it took.
        if (openNow.current !== null) return;
        const back = opener.current;
        opener.current = null;
        if (back?.isConnected) {
          back.focus();
          return;
        }
        document.getElementById(headingIdOf(section))?.focus();
      },
      reportDirty: (isDirty) => {
        if (sheet === section) setDirty(isDirty);
      },
    }),
    [sheet],
  );

  // A space found deleted is gone, even when an earlier read of it is still at hand.
  if (gone) return { state: 'notFound' as const, guard };
  if (space === undefined) {
    if (query.isPending) return { state: 'loading' as const, label: copy.status.loading, guard };
    return {
      state: 'failed' as const,
      message: copy.spaces.editor.loadFailed,
      retry: {
        label: copy.status.retry,
        run: () => {
          void query.refetch();
        },
      },
      guard,
    };
  }
  if (forbidden) return { state: 'forbidden' as const, guard };

  const gallery = photos.data;
  const completeness = gallery === undefined ? null : completenessOf(space, gallery.length);

  return {
    state: 'ready' as const,
    space,
    editable,
    /** The gallery as read, for the header's cover; undefined until it arrives. */
    photos: gallery,
    /** Null until the gallery has arrived, so the bar never counts a photo it has not read. */
    completeness,
    /** Once the gallery's read has failed, the way to read it again; null otherwise. */
    galleryRetry:
      gallery === undefined && photos.isError
        ? () => {
            void photos.refetch();
          }
        : null,
    sheetHost: hostOf,
    openSheet,
    photosEditing: {
      on: editingPhotos,
      set: setEditingPhotos,
    },
    onUploadingChange: setUploading,
    index: {
      label: copy.spaces.editor.navigation,
      items: SECTION_IDS.map((section: SectionId) => ({
        id: section,
        label: sectionName(section, copy),
        state: completeness?.states[section] ?? null,
        stateLabel:
          completeness === null ? null : copy.spaces.editor.states[completeness.states[section]],
        current: inView.current === section,
        choose: () => {
          inView.choose(section);
        },
      })),
    },
    privacy: place === 'admin' ? copy.spaces.editor.privacy : null,
    guard,
  };
}
