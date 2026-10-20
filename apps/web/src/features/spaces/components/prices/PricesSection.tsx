import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import {
  Button,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  XIcon,
} from '@shared/design-system';
import { usePricesSection } from '../../hooks/prices/usePricesSection';
import type { EditorPlace } from '../../types/EditorPlace';
import { SectionCard } from '../editor/SectionCard';
import { OptionalMark } from '../profile/OptionalMark';

type Row = ReturnType<typeof usePricesSection>['rows'][number];

/** A row's label: seen on a phone's card, said by a screen reader at every width. */
function RowLabel({ text }: { text: string }) {
  return <span className="md:sr-only">{text}</span>;
}

/** A select of a price's row, its options each in its own language; `ref` reaches its trigger. */
function RowSelect({
  label,
  value,
  options,
  disabled,
  choose,
  error,
  ref,
  className,
}: Row['period'] & { className: string }) {
  return (
    <Field label={<RowLabel text={label} />} error={error} className={className}>
      <Select value={value} onValueChange={choose} disabled={disabled}>
        <SelectTrigger ref={ref}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} lang={option.lang}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * «الأسعار»: the prices, for display only; from 768 px a small table, its columns named once in its
 * header, and below it a card per price; each a period, an audience, a shift of the space's saved
 * ones, a custom label in Arabic then English, and an amount in shekels; added up to the limit and
 * removed; saved, dated and confirmed as one group.
 */
export function PricesSection({
  place,
  space,
  hoursUnsaved,
  onDirtyChange,
}: {
  place: EditorPlace;
  space: AdminSpace;
  hoursUnsaved: boolean;
  onDirtyChange: (group: FactGroup, dirty: boolean) => void;
}) {
  const view = usePricesSection({ place, space, hoursUnsaved, onDirtyChange });
  const optional = (
    <span className="md:hidden">
      <OptionalMark label={view.columns.optional} />
    </span>
  );

  return (
    <SectionCard frame={view.frame}>
      <p className="text-caption text-muted-foreground">{view.intro}</p>
      {view.notes.map((note) => (
        <p key={note} className="text-caption text-muted-foreground">
          {note}
        </p>
      ))}
      {view.rows.length > 0 && (
        <div className="flex flex-col gap-2">
          <div
            aria-hidden="true"
            className="hidden text-label text-muted-foreground md:grid md:grid-cols-12 md:gap-3"
          >
            <span className="md:col-span-2">{view.columns.period}</span>
            <span className="md:col-span-2">{view.columns.audience}</span>
            <span className="md:col-span-2">{view.columns.shift}</span>
            <span className="flex flex-col md:col-span-3">
              {view.columns.label}
              <OptionalMark label={view.columns.optional} />
            </span>
            <span className="md:col-span-2">{view.columns.amount}</span>
            <span className="md:col-span-1" />
          </div>
          <ul className="flex flex-col gap-4 md:gap-2">
            {view.rows.map((row) => (
              <li
                key={row.key}
                role="group"
                aria-label={row.label}
                className="grid gap-3 rounded-lg border p-4 md:grid-cols-12 md:items-start md:gap-3 md:rounded-none md:border-0 md:p-0"
              >
                <RowSelect {...row.period} className="md:col-span-2" />
                <RowSelect {...row.audience} className="md:col-span-2" />
                <RowSelect {...row.shift} className="md:col-span-2" />
                <div className="flex flex-col gap-2 md:col-span-3">
                  <Field
                    label={<RowLabel text={row.labelAr.label} />}
                    labelEnd={optional}
                    error={row.labelAr.error}
                  >
                    <Input dir="rtl" autoComplete="off" {...row.labelAr.binding} />
                  </Field>
                  <Field
                    label={<RowLabel text={row.labelEn.label} />}
                    labelEnd={optional}
                    error={row.labelEn.error}
                  >
                    <Input
                      dir="ltr"
                      autoComplete="off"
                      placeholder={row.labelEn.placeholder}
                      {...row.labelEn.binding}
                    />
                  </Field>
                </div>
                <Field
                  label={<RowLabel text={row.amount.label} />}
                  error={row.amount.error}
                  className="md:col-span-2"
                >
                  <Input dir="ltr" inputMode="decimal" autoComplete="off" {...row.amount.binding} />
                </Field>
                <div className="flex justify-end md:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={row.remove.label}
                    disabled={row.remove.disabled}
                    onClick={row.remove.run}
                  >
                    <XIcon aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={view.add.disabled} onClick={view.add.run}>
          {view.add.label}
        </Button>
        {view.add.reason && (
          <span className="text-caption text-muted-foreground">{view.add.reason}</span>
        )}
      </div>
    </SectionCard>
  );
}
