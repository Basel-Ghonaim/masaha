const { Button: MapButton } = window.MasahaDesignSystem;

// U6 (PU-012): a state is a shape as well as a colour — filled (متاح), filled with a bar (ممتلئ),
// hollow (مغلق الآن), dashed hollow (لا تتوفر حالة مباشرة). The legend draws the same marks.
const pinState = (s) => (!s.verified ? 'none' : (s.closure ? 'closed' : s.status) || 'none');
const PIN_MARK = { open: 'pin-mark pin-open', full: 'pin-mark pin-full', closed: 'pin-mark pin-closed', none: 'pin-mark pin-none' };
const PinMark = ({ state }) => <span className={PIN_MARK[state]} aria-hidden="true"></span>;

function project({ lat, lng }) {
  const b = window.MASAHA.bounds;
  return { left: ((lng - b.west) / (b.east - b.west)) * 100 + '%', top: ((b.north - lat) / (b.north - b.south)) * 100 + '%' };
}
// The same point as a fraction of the map, for moving the map under it.
const fraction = ({ lat, lng }) => { const b = window.MASAHA.bounds; return { x: (lng - b.west) / (b.east - b.west), y: (b.north - lat) / (b.north - b.south) }; };

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

// U6: above the map, so the key is always in view at every width.
function MapLegend() {
  const items = [['open', tr("متاح", "Available")], ['full', tr("ممتلئ", "Full")], ['closed', tr("مغلق الآن", "Closed now")], ['none', tr("لا تتوفر حالة مباشرة", "No live status")]];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground" aria-label={tr("دليل الخريطة", "Map legend")}>
      {items.map(([st, t]) => <li key={st} className="flex items-center gap-2"><PinMark state={st} />{t}</li>)}
    </ul>
  );
}

// `static`: the markers are pictures with their names, not buttons (the space page's one pin, PU-026).
// `focus`: a point of the map to bring to `focusAt` (fractions of the map's box) — the selected space
// above the phone's sheet (U6), or the visitor's location on «مركّز على موقعي». The illustration
// moves under it as a tiled map would.
function SpaceMap({ spaces, selectedId, onSelect, user, userSource, picking, onPick, label, className, children, static: isStatic, focus, focusAt = { x: 0.5, y: 0.5 }, offset: offsetProp, onOffset, legend }) {
  const box = React.useRef(null);
  const layer = React.useRef(null);
  const [ownOffset, setOwnOffset] = React.useState({ x: 0, y: 0 });
  const offset = offsetProp || ownOffset;
  const setOffset = onOffset || setOwnOffset;
  const centreOn = (pt, at = { x: 0.5, y: 0.5 }) => {
    const r = box.current.getBoundingClientRect(), f = fraction(pt);
    setOffset({ x: (at.x - f.x) * r.width, y: (at.y - f.y) * r.height });
  };
  React.useEffect(() => { if (focus) centreOn(focus, focusAt); }, [focus && focus.lat, focus && focus.lng, focusAt.y]);
  const pick = (e) => {
    if (!picking) return;
    const r = layer.current.getBoundingClientRect(), b = window.MASAHA.bounds;
    onPick({ lng: b.west + ((e.clientX - r.left) / r.width) * (b.east - b.west), lat: b.north - ((e.clientY - r.top) / r.height) * (b.north - b.south) });
  };
  const moved = offset.x || offset.y;
  return (
    <div ref={box} role="region" aria-label={label} className={'relative isolate overflow-hidden rounded-xl border bg-muted ' + (picking ? 'border-primary ' : 'border-border ') + (className || '')}>
      <div className="map-pan absolute inset-0" style={moved ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined}>
        <MapIllustration />
        <div dir="ltr" ref={layer} className={'absolute inset-0' + (picking ? ' cursor-crosshair' : '')} onClick={pick}>
          {user && userSource === 'gps' && <span className="map-accuracy absolute size-16 rounded-full" style={project(user)} aria-hidden="true"></span>}
          {user && <span className="map-pin absolute z-10 size-4 rounded-full border-2 border-card bg-primary shadow-floating" style={project(user)} role="img" aria-label={userSource === 'manual' ? tr("موقعي (يدوي)", "My location (manual)") : tr("موقعك", "Your location")}></span>}
          {user && userSource === 'manual' && (
            <span className="map-pin-label absolute z-10 whitespace-nowrap rounded-full bg-primary px-2 py-1 text-caption text-primary-foreground shadow-floating" style={project(user)} dir={DIR} aria-hidden="true">{tr("موقعي (يدوي)", "My location (manual)")}</span>
          )}
          {spaces.map((s) => {
            const on = s.id === selectedId;
            const name = `${spaceName(s)} — ${window.statusWord(s)}`;
            const inner = <><PinMark state={pinState(s)} /><span className="pin-name rounded-full border border-border bg-card px-2 py-1 text-caption text-foreground shadow-floating" dir={DIR} aria-hidden="true"><SpaceName space={s} /></span></>;
            // U6: dots; the name on the selected one and on hover or focus. Selected is a ring, never a fill.
            if (isStatic) return <span key={s.id} className="map-pin space-pin absolute" data-selected={on || undefined} style={project(s)} role="img" aria-label={name}>{inner}</span>;
            return (
              <button key={s.id} type="button" tabIndex={picking ? -1 : undefined} onClick={(e) => { if (picking) return; e.stopPropagation(); onSelect(s.id); }} aria-pressed={on} aria-label={name}
                className={'map-pin space-pin absolute focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring' + (on ? ' z-10' : '')} data-selected={on || undefined} style={project(s)}>
                {inner}
              </button>
            );
          })}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-4 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          {/* U6: the legend inside the map, by the location control, so it is always in view. */}
          {legend ? <div className="rounded-lg bg-card px-3 py-2 shadow-floating">{legend}</div> : <span></span>}
          {/* Design issue 1: «الأقرب إليّ» is the one location control; on the map, once a location is in
              use, this only brings it back into view. Hidden while picking (U7). */}
          {user && !picking && !isStatic && <MapButton variant="outline" size="sm" className="pointer-events-auto bg-card shadow-floating" onClick={() => centreOn(user)}>{tr("مركّز على موقعي", "Centre on my location")}</MapButton>}
        </div>
        {children && <div className="pointer-events-auto md:max-w-sm">{children}</div>}
      </div>
    </div>
  );
}

Object.assign(window, { SpaceMap, MapLegend, PinMark, pinState });
