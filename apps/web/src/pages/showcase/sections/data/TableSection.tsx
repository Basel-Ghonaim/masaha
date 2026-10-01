import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';
import { MemberCell, MemberStatus, type MembersSamples } from './members';

type TableSamples = { title: string; caption: string };

export function TableSection({
  samples,
  members,
}: {
  samples: TableSamples;
  members: MembersSamples;
}) {
  const { columns } = members;

  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Card className="w-full gap-0 py-0">
          <Table aria-label={members.label}>
            <TableHeader>
              <TableRow>
                <TableHead>{columns.member}</TableHead>
                <TableHead>{columns.membership}</TableHead>
                <TableHead>{columns.ends}</TableHead>
                <TableHead>{columns.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.rows.slice(0, 4).map((member, index) => (
                <TableRow key={member.phone}>
                  <TableCell>
                    <MemberCell member={member} />
                  </TableCell>
                  <TableCell>{member.plan}</TableCell>
                  <TableCell>
                    <span dir="ltr">{member.ends}</span>
                  </TableCell>
                  <TableCell>
                    <MemberStatus member={member} index={index} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
