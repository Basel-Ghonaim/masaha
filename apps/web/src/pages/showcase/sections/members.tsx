import { Avatar, AvatarFallback, Badge, type BadgeProps } from '@shared/design-system';

// The Owner › Members stress test's rows, shared by the Table and DataTable sections. A feature
// builds its own member row; these only fill the showcase.

export type Member = { name: string; phone: string; plan: string; ends: string; status: string };

export type MembersSamples = {
  label: string;
  columns: {
    member: string;
    membership: string;
    ends: string;
    status: string;
    attendance: string;
  };
  rows: Member[];
};

// Each fixture row's status, by position: fixtures hold phrases only, never code values.
const STATUS_VARIANTS: NonNullable<BadgeProps['variant']>[] = [
  'warning',
  'warning',
  'success',
  'success',
  'destructive',
  'success',
  'success',
  'destructive',
];

export function statusVariant(index: number) {
  return STATUS_VARIANTS[index % STATUS_VARIANTS.length] ?? 'neutral';
}

// The first letters of the first and last names, without the article («الحلو» gives «ح»). Arabic
// letters are spaced, as in the stress test, so they do not join.
function initials(name: string) {
  const words = name.split(' ');
  const letters = [words[0], words.at(-1)].map(
    (word) => word?.replace(/^(ال|al-)/, '').charAt(0) ?? '',
  );
  return letters.join(/[؀-ۿ]/.test(name) ? ' ' : '');
}

export function MemberAvatar({ member }: { member: Member }) {
  return (
    <Avatar aria-hidden>
      <AvatarFallback>{initials(member.name)}</AvatarFallback>
    </Avatar>
  );
}

/** The member's avatar, name and phone, as in the stress test's first column. */
export function MemberCell({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-3">
      <MemberAvatar member={member} />
      <div className="flex flex-col">
        <span className="text-body-sm text-foreground">{member.name}</span>
        <span dir="ltr" className="self-start text-caption text-muted-foreground">
          {member.phone}
        </span>
      </div>
    </div>
  );
}

export function MemberStatus({ member, index }: { member: Member; index: number }) {
  return <Badge variant={statusVariant(index)}>{member.status}</Badge>;
}
