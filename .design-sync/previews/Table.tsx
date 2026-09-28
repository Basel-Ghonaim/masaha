import './_document';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Card,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  type BadgeProps,
} from '@masaha/design-system';

// Ported from the showcase's TableSection (apps/web/src/pages/showcase/sections/TableSection.tsx)
// and its members helpers (sections/members.tsx): the Owner › Members stress test's rows.

type Member = { name: string; phone: string; plan: string; ends: string; status: string };

const MEMBERS: Member[] = [
  {
    name: 'سارة الحلو',
    phone: '+970 59 234 1188',
    plan: 'شهرية',
    ends: '28/09/2026',
    status: 'ينتهي خلال يومين',
  },
  {
    name: 'محمد أبو شعبان',
    phone: '+970 56 771 0932',
    plan: 'أسبوعية',
    ends: '29/09/2026',
    status: 'ينتهي خلال 3 أيام',
  },
  {
    name: 'نور الهدى عبد الرحمن الخالدي',
    phone: '+970 59 610 2284',
    plan: 'فصلية',
    ends: '30/11/2026',
    status: 'نشط',
  },
  { name: 'ليان عوض', phone: '+970 59 818 4471', plan: 'شهرية', ends: '14/10/2026', status: 'نشط' },
  {
    name: 'هبة قاسم',
    phone: '+970 59 440 2210',
    plan: 'أسبوعية',
    ends: '24/09/2026',
    status: 'منتهية',
  },
];

// Each row's status colour, by position.
const STATUS_VARIANTS: NonNullable<BadgeProps['variant']>[] = [
  'warning',
  'warning',
  'success',
  'success',
  'destructive',
];

// The first letters of the first and last names, without the article, spaced so they do not join.
function initials(name: string) {
  const words = name.split(' ');
  return [words[0], words.at(-1)].map((word) => word?.replace(/^ال/, '').charAt(0) ?? '').join(' ');
}

function MemberCell({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar aria-hidden>
        <AvatarFallback>{initials(member.name)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-body-sm text-foreground">{member.name}</span>
        <span dir="ltr" className="self-start text-caption whitespace-nowrap text-muted-foreground">
          {member.phone}
        </span>
      </div>
    </div>
  );
}

/** Members in a Card: a muted header row, dense rows, a divider between rows. */
export function Members() {
  return (
    <Card className="w-full gap-0 py-0">
      <Table aria-label="مشتركو مساحة الريادة">
        <TableHeader>
          <TableRow>
            <TableHead>المشترك</TableHead>
            <TableHead>العضوية</TableHead>
            <TableHead>تنتهي في</TableHead>
            <TableHead>الحالة</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MEMBERS.slice(0, 4).map((member, index) => (
            <TableRow key={member.phone}>
              <TableCell>
                <MemberCell member={member} />
              </TableCell>
              <TableCell>{member.plan}</TableCell>
              <TableCell>
                <span dir="ltr">{member.ends}</span>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[index]}>{member.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/** Text-only columns with a footer row on `muted`. */
export function WithFooter() {
  return (
    <Card className="w-full gap-0 py-0">
      <Table aria-label="عضويات مساحة الريادة">
        <TableHeader>
          <TableRow>
            <TableHead>المشترك</TableHead>
            <TableHead>العضوية</TableHead>
            <TableHead>تنتهي في</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MEMBERS.map((member) => (
            <TableRow key={member.phone}>
              <TableCell>{member.name}</TableCell>
              <TableCell>{member.plan}</TableCell>
              <TableCell>
                <span dir="ltr">{member.ends}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>مجموع المشتركين</TableCell>
            <TableCell>5</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Card>
  );
}
