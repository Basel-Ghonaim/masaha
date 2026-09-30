// Shared finance pieces: date range, CSV export, simple DS-coloured charts with a screen-reader table.
const FX = window.MasahaDesignSystem;

const isoOf = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dayDate = (iso) => new Date(iso + 'T12:00:00');

function RangePicker({ value, onChange, label }) {
  const [open, setOpen] = React.useState(false);
  const txt = value && value.from ? DESK.fmtDate(isoOf(value.from)) + ' – ' + (value.to ? DESK.fmtDate(isoOf(value.to), true) : '…') : tr('اختر الفترة', 'Choose a period');
  return (
    <FX.Field label={label || tr('الفترة', 'Period')}>
      <FX.DatePicker open={open} onOpenChange={setOpen}>
        <FX.DatePickerTrigger>{txt}</FX.DatePickerTrigger>
        <FX.DatePickerContent>
          <FX.Calendar mode="range" lang={LANG} selected={value} onSelect={(r) => { onChange(r || { from: undefined, to: undefined }); if (r && r.from && r.to && r.from.getTime() !== r.to.getTime()) setOpen(false); }} defaultMonth={value && value.from} today={dayDate(DESK.TODAY)} previousMonthLabel={tr('الشهر السابق', 'Previous month')} nextMonthLabel={tr('الشهر التالي', 'Next month')} />
        </FX.DatePickerContent>
      </FX.DatePicker>
    </FX.Field>
  );
}
const inRange = (iso, r) => !r || !r.from || (iso >= isoOf(r.from) && iso <= isoOf(r.to || r.from));

function downloadCSV(name, header, rows) {
  const esc = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = '\uFEFF' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  FX.toast.success(tr('نُزّل الملف', 'File downloaded'), { description: name + '.csv' });
}
const CsvButton = ({ onClick }) => <FX.Button variant="outline" onClick={onClick}><FX.ArrowDownIcon />{tr('تصدير CSV', 'Export CSV')}</FX.Button>;

// Stacked vertical bars. series: [{ name, cls }]; data: [{ label, values: [] }]
// tick(d, i) → axis label or '' (never truncated); axisCaption sits under the axis; altHide hides every other label on phones.
function BarChart({ title, series, data, fmt = (n) => n, height = 'chart-h', showEvery = 1, tick, axisCaption, altHide }) {
  const max = Math.max(1, ...data.map((d) => d.values.reduce((a, v) => a + v, 0)));
  return (
    <figure className="relative flex flex-col gap-3">
      <figcaption className="sr-only">{title}</figcaption>
      {series.length > 1 && (
        <ul className="flex flex-wrap gap-4" aria-hidden="true">
          {series.map((s) => <li key={s.name} className="flex items-center gap-2 text-caption text-muted-foreground"><span className={'legend-swatch rounded-sm ' + s.cls}></span>{s.name}</li>)}
        </ul>
      )}
      <div className={'flex items-end gap-1 border-b border-border ' + height} aria-hidden="true">
        {data.map((d, i) => {
          const total = d.values.reduce((a, v) => a + v, 0);
          return (
            <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={d.label + ': ' + fmt(total)}>
              <div className="flex w-full flex-col-reverse overflow-hidden bar-top" style={{ height: (total / max) * 100 + '%' }}>
                {d.values.map((v, k) => <div key={k} className={series[k].cls} style={{ height: total ? (v / total) * 100 + '%' : 0 }}></div>)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {data.map((d, i) => { const t = tick ? tick(d, i) : i % showEvery === 0 ? d.label : ''; return <span key={i} className={'chart-tick flex-1 text-center text-caption text-muted-foreground' + (altHide && i % 2 ? ' tick-alt' : '')}>{t}</span>; })}
      </div>
      {axisCaption && <p className="text-center text-caption text-muted-foreground" aria-hidden="true">{axisCaption}</p>}
      <div className="sr-only"><table>
        <caption>{title}</caption>
        <thead><tr><th scope="col">{tr('الفترة', 'Period')}</th>{series.map((s) => <th key={s.name} scope="col">{s.name}</th>)}</tr></thead>
        <tbody>{data.map((d, i) => <tr key={i}><th scope="row">{d.label}</th>{d.values.map((v, k) => <td key={k}>{fmt(v)}</td>)}</tr>)}</tbody>
      </table></div>
    </figure>
  );
}

// Day × hour heatmap: primary at stepped opacity (no new colours); numbers live in the table fallback.
function Heatmap({ title, rows, hours, unit }) {
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  const step = (v) => [0.12, 0.3, 0.5, 0.72, 1][Math.min(4, Math.floor((v / max) * 5))];
  return (
    <figure className="relative flex flex-col gap-3">
      <figcaption className="sr-only">{title}</figcaption>
      <div className="heat-grid" style={{ gridTemplateColumns: `auto repeat(${hours.length}, minmax(0,1fr))` }} aria-hidden="true">
        <span></span>
        {hours.map((h) => <span key={h} className="text-center text-caption text-muted-foreground"><Num>{h}</Num></span>)}
        {rows.map((r) => (
          <React.Fragment key={r.label}>
            <span className="pe-2 text-caption text-muted-foreground">{r.label}</span>
            {r.values.map((v, i) => <span key={i} className="heat-cell rounded-sm bg-muted"><span className="block h-full w-full rounded-sm bg-primary" style={{ opacity: step(v) }}></span></span>)}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-2 text-caption text-muted-foreground" aria-hidden="true">
        {tr('أقل', 'Fewer')}{[0.12, 0.3, 0.5, 0.72, 1].map((o) => <span key={o} className="legend-swatch rounded-sm bg-primary" style={{ opacity: o }}></span>)}{tr('أكثر', 'More')}
      </div>
      <div className="sr-only"><table>
        <caption>{title} ({unit})</caption>
        <thead><tr><th scope="col">{tr('اليوم', 'Day')}</th>{hours.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.label}><th scope="row">{r.label}</th>{r.values.map((v, i) => <td key={i}>{v}</td>)}</tr>)}</tbody>
      </table></div>
    </figure>
  );
}

Object.assign(window, { RangePicker, inRange, isoOf, dayDate, downloadCSV, CsvButton, BarChart, Heatmap });
