import { Button } from '@shared/design-system';
import { useId, useRef } from 'react';
import {
  useSpaceOwnersActions,
  type EditedSpace,
} from '../../hooks/space-owners/useSpaceOwnersActions';
import { LinkOwnerDialog } from '../link/LinkOwnerDialog';
import { UnlinkOwnerDialog } from '../unlink/UnlinkOwnerDialog';

/**
 * A space's owners' actions, for its editor's notice: an unlink per owner of a verified space, or the
 * link on an unverified one, each in its dialog, after which the focus returns to the button that
 * opened it, or, when that button is gone with the owner or the notice it stood in, to the element the
 * editor gives (`space.focusFallback`). The link waits, marked and in reach, while the editor has
 * unsaved changes. A new owner with no account is added on the owners page (`addOwnerLink`).
 */
export function SpaceOwnersActions({
  space,
  addOwnerLink,
}: {
  space: EditedSpace;
  addOwnerLink: string;
}) {
  const actions = useSpaceOwnersActions(space, addOwnerLink);
  // The button that opened the dialog, which the focus returns to.
  const opener = useRef<HTMLButtonElement | null>(null);
  const reasonId = useId();
  const { dialog } = actions;

  return (
    <>
      {actions.verified ? (
        actions.unlinks.map((unlink) => (
          <Button
            key={unlink.key}
            type="button"
            variant="outline"
            size="sm"
            onClick={(event) => {
              opener.current = event.currentTarget;
              unlink.open();
            }}
          >
            {unlink.label}
          </Button>
        ))
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-disabled={actions.link.disabled || undefined}
            aria-describedby={actions.link.reason === undefined ? undefined : reasonId}
            onClick={(event) => {
              opener.current = event.currentTarget;
              actions.link.open();
            }}
          >
            {actions.link.label}
          </Button>
          {actions.link.reason !== undefined && (
            <span id={reasonId} className="self-center text-caption">
              {actions.link.reason}
            </span>
          )}
        </>
      )}
      {dialog?.kind === 'link' && (
        <LinkOwnerDialog
          target={dialog.target}
          onClose={actions.close}
          returnFocus={opener}
          fallbackFocus={space.focusFallback}
        />
      )}
      {dialog?.kind === 'unlink' && (
        <UnlinkOwnerDialog
          space={dialog.space}
          owner={dialog.owner}
          onClose={actions.close}
          returnFocus={opener}
          fallbackFocus={space.focusFallback}
        />
      )}
    </>
  );
}
