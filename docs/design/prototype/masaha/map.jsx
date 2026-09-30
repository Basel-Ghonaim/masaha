const { Button: MapButton } = window.MasahaDesignSystem;

const mapDot = { open: 'bg-success', full: 'bg-warning', closed: 'bg-muted-foreground' };
const dotClass = (s) => (s.verified ? mapDot[s.status] : 'border border-muted-foreground bg-card');

function project({ lat, lng }) {
  const b = window.MASAHA.bounds;
  return { left: ((lng - b.west) / (b.east - b.west)) * 100 + '%', top: ((b.north - lat) / (b.north - b.south)) * 100 + '%' };
}

function MapIllustration() {
  return (
    <svg className="map-illustration absolute inset-0 size-full" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
      <rect className="land" width="1000" height="700" />
      <rect className="block" x="180" y="80" width="160" height="110" rx="6" />
      <rect className="block" x="620" y="90" width="150" height="120" rx="6" />
      <rect className="block" x="420" y="520" width="190" height="110" rx="6" />
      <rect className="block" x="760" y="520" width="170" height="120" rx="6" />
      <rect className="park" x="360" y="360" width="120" height="80" rx="6" />
      <rect className="park" x="830" y="250" width="110" height="90" rx="6" />
      <g>
        {['M110 0 L45 700', 'M0 300 L1000 330', 'M60 460 L1000 490', 'M300 0 L720 700', 'M900 0 L880 700', 'M520 0 L540 700'].map((d) => <g key={d}><path className="road-edge" d={d} vectorEffect="non-scaling-stroke" /><path className="road" d={d} vectorEffect="non-scaling-stroke" /></g>)}
        {['M90 160 L1000 190', 'M70 600 L1000 620', 'M200 0 L170 700', 'M700 0 L690 700', 'M380 0 L380 300'].map((d) => <path key={d} className="lane" d={d} vectorEffect="non-scaling-stroke" />)}
      </g>
      <path className="sea" d="M0 0 L108 0 L43 700 L0 700 Z" />
    </svg>
  );
}

function MapLegend() {
  const items = [['bg-success', tr("متاح", "Available")], ['bg-warning', tr("ممتلئ", "Full")], ['bg-muted-foreground', tr("مغلق الآن", "Closed now")], ['border border-muted-foreground bg-card', tr("لا تتوفر حالة مباشرة", "No live status")]];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground" aria-label={tr("دليل الألوان", "Legend")}>
      {items.map(([c, t]) => <li key={t} className="flex items-center gap-1"><span className={'size-2.5 rounded-full ' + c} aria-hidden="true"></span>{t}</li>)}
    </ul>
  );
}

function SpaceMap({ spaces, selectedId, onSelect, user, userSource, picking, onPick, onLocate, locating, label, className, children }) {
  const layer = React.useRef(null);
  const pick = (e) => {
    if (!picking) return;
    const r = layer.current.getBoundingClientRect(), b = window.MASAHA.bounds;
    onPick({ lng: b.west + ((e.clientX - r.left) / r.width) * (b.east - b.west), lat: b.north - ((e.clientY - r.top) / r.height) * (b.north - b.south) });
  };
  return (
    <div role="region" aria-label={label} className={'relative isolate overflow-hidden rounded-xl border bg-muted ' + (picking ? 'border-primary ' : 'border-border ') + (className || '')}>
      <MapIllustration />
      <div dir="ltr" ref={layer} className={'absolute inset-0' + (picking ? ' cursor-crosshair' : '')} onClick={pick}>
        {user && userSource === 'gps' && <span className="map-accuracy absolute size-16 rounded-full" style={project(user)} aria-hidden="true"></span>}
        {user && <span className="map-pin absolute z-10 size-4 rounded-full border-2 border-card bg-primary shadow-floating" style={project(user)} role="img" aria-label={userSource === 'manual' ? tr("موقعي (يدوي)", "My location (manual)") : tr("موقعك", "Your location")}></span>}
        {user && userSource === 'manual' && (
          <span className="map-pin-label absolute z-10 whitespace-nowrap rounded-full bg-primary px-2 py-1 text-caption text-primary-foreground shadow-floating" style={project(user)} dir={DIR} aria-hidden="true">{tr("موقعي (يدوي)", "My location (manual)")}</span>
        )}
        {spaces.map((s) => {
          const on = s.id === selectedId;
          return (
            <button key={s.id} type="button" tabIndex={picking ? -1 : undefined} onClick={(e) => { if (picking) return; e.stopPropagation(); onSelect(s.id); }} aria-pressed={on} aria-label={`${s.name} — ${window.statusWord(s)}`}
              className={'map-pin absolute flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-caption shadow-floating focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ' + (on ? 'z-10 border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground')}
              style={project(s)}>
              <span className={'size-2.5 rounded-full ' + dotClass(s)} aria-hidden="true"></span>{s.name}
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-4 p-3">
        <div className="flex justify-end">
          {onLocate && <MapButton variant="outline" size="sm" className="pointer-events-auto bg-card shadow-floating" onClick={onLocate} disabled={locating} aria-pressed={!!user}>{locating ? tr("جارٍ تحديد موقعك…", "Finding your location…") : tr("موقعي", "My location")}</MapButton>}
        </div>
        {children && <div className="pointer-events-auto md:max-w-sm">{children}</div>}
      </div>
    </div>
  );
}

Object.assign(window, { SpaceMap, MapLegend });
