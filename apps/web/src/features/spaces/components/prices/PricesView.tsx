import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/design-system';
import type { PricesTableView } from '../../services/pricesView';

/** The prices as a visitor reads them: a small table, its columns only where a price needs them. */
export function PricesView({ table }: { table: PricesTableView }) {
  const { columns } = table;
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <caption className="sr-only">{table.caption}</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{columns.period}</TableHead>
            {columns.audience && <TableHead scope="col">{columns.audience}</TableHead>}
            {columns.shift && <TableHead scope="col">{columns.shift}</TableHead>}
            <TableHead scope="col">{columns.price}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell>{row.period}</TableCell>
              {columns.audience && (
                <TableCell className={row.student ? undefined : 'text-muted-foreground'}>
                  {row.audience}
                </TableCell>
              )}
              {columns.shift && (
                <TableCell className={row.shift === null ? 'text-muted-foreground' : undefined}>
                  {row.shift ?? '—'}
                </TableCell>
              )}
              <TableCell className="text-label">{row.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
