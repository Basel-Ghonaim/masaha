const { Alert: LocAlert, AlertTitle: LocAlertTitle, AlertDescription: LocAlertDescription, AlertAction: LocAlertAction, Button: LocButton } = window.MasahaDesignSystem;

function NearMeButton({ near, className }) {
  const { loc, request } = near;
  const on = loc.status === 'granted';
  return (
    <LocButton variant={on ? 'secondary' : 'outline'} className={className} onClick={request} disabled={loc.status === 'locating'} aria-pressed={on}>
      {loc.status === 'locating' ? tr("جارٍ تحديد موقعك…", "Finding your location…") : tr("الأقرب إليّ", "Nearest to me")}
    </LocButton>
  );
}

// onPickOnMap / onChooseArea: page decides where each fallback goes.
function LocationStatus({ near, onPickOnMap, onChooseArea, showIdle = true }) {
  const { loc, clear, startPick } = near;
  const actions = (
    <div className="flex flex-wrap gap-2">
      <LocButton variant="outline" size="sm" onClick={onPickOnMap}>{tr("حدّد موقعي على الخريطة", "Set my location on the map")}</LocButton>
      <LocButton variant="outline" size="sm" onClick={onChooseArea}>{tr("اختر منطقتك", "Choose your area")}</LocButton>
    </div>
  );
  if (loc.status === 'imprecise') return (
    <LocAlert variant="warning">
      <LocAlertTitle>{tr("تعذّر تحديد موقعك بدقة", "We couldn’t find your location precisely")}</LocAlertTitle>
      <LocAlertDescription>{tr("يبدو أن الموقع خارج قطاع غزة أو أن دقته أقل من ", "The position seems to be outside the Gaza Strip or less accurate than ")}<span dir="ltr">2</span>{tr(" كم، لذلك لم نستخدمه.", " km, so we didn’t use it.")}</LocAlertDescription>
      <LocAlertAction>{actions}</LocAlertAction>
    </LocAlert>
  );
  if (loc.status === 'denied') return (
    <LocAlert variant="warning">
      <LocAlertTitle>{tr("تعذّر تحديد موقعك. اختر منطقتك من الفلاتر.", "We couldn’t find your location. Choose your area in the filters.")}</LocAlertTitle>
      <LocAlertAction>{actions}</LocAlertAction>
    </LocAlert>
  );
  if (loc.status === 'granted') return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
      <span>{loc.source === 'manual' ? tr("مرتبة حسب المسافة من الموقع الذي حدّدته على الخريطة.", "Sorted by distance from the point you set on the map.") : tr("مرتبة حسب المسافة من موقعك.", "Sorted by distance from your location.")}{tr(" المسافات تقريبية بخط مستقيم.", " Distances are approximate, in a straight line.")}</span>
      <span>{PRIVACY_LINE}</span>
      <div className="flex gap-1">
        {loc.source === 'manual' && <LocButton variant="link" size="sm" onClick={startPick}>{tr("تغيير الموقع", "Change location")}</LocButton>}
        <LocButton variant="link" size="sm" onClick={clear}>{loc.source === 'manual' ? tr("مسح موقعي", "Clear my location") : tr("إيقاف", "Turn off")}</LocButton>
      </div>
    </div>
  );
  return null;
}

Object.assign(window, { NearMeButton, LocationStatus });
