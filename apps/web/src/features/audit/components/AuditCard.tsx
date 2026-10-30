import type { AuditRowView } from '../types/AuditRowView';
import { ActionBadge, ActorText } from './AuditCells';
import { AuditTargetText } from './AuditTargetText';

/** An entry below 768 px: the action's badge and the time on one line, the target, the details, the actor. */
export function AuditCard({ row }: { row: AuditRowView }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ActionBadge action={row.action} />
        <span dir="ltr" className="text-caption text-muted-foreground">
          {row.at}
        </span>
      </div>
      <AuditTargetText target={row.target} />
      {row.space !== null && (
        <span className="text-body-sm text-muted-foreground">{row.space}</span>
      )}
      {row.details !== null && (
        <p dir="auto" className="text-body-sm break-words">
          {row.details}
        </p>
      )}
      <span className="text-caption text-muted-foreground">
        <ActorText actor={row.actor} />
      </span>
    </div>
  );
}
