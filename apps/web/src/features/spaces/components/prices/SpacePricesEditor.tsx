import { ForbiddenState, NotFoundState } from '@shared/routing';
import { useSpacePricesEditor } from '../../hooks/prices/useSpacePricesEditor';
import { EditorFailure } from '../editor/EditorFailure';
import { EditorLoading } from '../editor/EditorLoading';
import { LeaveDialog } from '../editor/LeaveDialog';
import { PricesSection } from './PricesSection';

/**
 * An owner's «الأسعار المعلنة», on Packages & prices: the editor's prices section on a page of its
 * own, saved, dated and confirmed as in the editor, with its own loading, failure and not-found
 * states and its own guard before the page is left with unsaved prices. The opening hours are on the
 * profile, so its line for a space with no shift leads there (`hoursLink`).
 */
export function SpacePricesEditor({ spaceId, hoursLink }: { spaceId: number; hoursLink: string }) {
  const editor = useSpacePricesEditor('owner', spaceId);

  if (editor.state === 'loading') return <EditorLoading label={editor.label} />;
  if (editor.state === 'notFound') return <NotFoundState />;
  if (editor.state === 'failed') {
    return <EditorFailure message={editor.message} retry={editor.retry} />;
  }
  // An owner's link is what verifies a space, so an owner is never shown one they may not edit.
  if (editor.readOnly) return <ForbiddenState />;

  return (
    <>
      <PricesSection
        place="owner"
        space={editor.space}
        hoursUnsaved={false}
        hoursLink={hoursLink}
        onDirtyChange={editor.onDirtyChange}
      />
      <LeaveDialog guard={editor.guard} />
    </>
  );
}
