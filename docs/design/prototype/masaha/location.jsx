const { Alert: LocAlert, AlertTitle: LocAlertTitle, AlertDescription: LocAlertDescription, AlertAction: LocAlertAction, Button: LocButton } = window.MasahaDesignSystem;

// U2: the one «الأقرب إليّ» control, beside the result count on Home and in both Directory views.
// `on` is whether the list is sorted by distance; pressing it again turns that off. With no
// location yet it asks for one, and the page sorts once it arrives.
function NearMeButton({ near, on, onToggle, className }) {
  const locating = near.loc.status === 'locating';
  return (
    <LocButton variant={on ? 'secondary' : 'outline'} size="sm" className={className} onClick={onToggle || (on ? near.clear : near.request)} loading={locating} aria-pressed={!!on}>
      {locating ? tr("جارٍ تحديد موقعك…", "Finding your location…") : tr("الأقرب إليّ", "Nearest to me")}
    </LocButton>
  );
}

// U2: one state line under it, in four states — locating, in use, denied, imprecise — each with the
// same two fallbacks where the location failed, and the privacy line in all of them.
// `sorting`: the list is sorted by distance; `onStop` ends that (on Home, by clearing the location;
// in the Directory, by leaving the sort, the location kept until «مسح موقعي»).
// onPickOnMap / onChooseArea: the page decides where each fallback goes; `onChangePick` where
// «تغيير الموقع» picks again (a page with no map sends it to the Directory's).
function LocationStatus({ near, sorting, onStop, onPickOnMap, onChooseArea, onChangePick }) {
  const { loc, clear, startPick } = near;
  const stop = onStop || clear;
  const privacy = <span>{PRIVACY_LINE}</span>;
  const fallbacks = (
    <div className="flex flex-wrap gap-2">
      <LocButton variant="outline" size="sm" onClick={onPickOnMap}>{tr("حدّد موقعي على الخريطة", "Set my location on the map")}</LocButton>
      <LocButton variant="outline" size="sm" onClick={onChooseArea}>{tr("اختر منطقتك", "Choose your area")}</LocButton>
    </div>
  );
  if (loc.status === 'locating') return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground" role="status">
      <span>{tr("جارٍ تحديد موقعك…", "Finding your location…")}</span>{privacy}
    </p>
  );
  if (loc.status === 'imprecise') return (
    <LocAlert variant="warning">
      <LocAlertTitle>{tr("تعذّر تحديد موقعك بدقة", "We couldn’t find your location precisely")}</LocAlertTitle>
      <LocAlertDescription>{tr("يبدو أن الموقع خارج قطاع غزة أو أن دقته أقل من ", "The position seems to be outside the Gaza Strip or less accurate than ")}<span dir="ltr">2</span>{tr(" كم، لذلك لم نستخدمه. ", " km, so we didn’t use it. ")}{PRIVACY_LINE}</LocAlertDescription>
      <LocAlertAction>{fallbacks}</LocAlertAction>
    </LocAlert>
  );
  if (loc.status === 'denied') return (
    <LocAlert variant="warning">
      <LocAlertTitle>{tr("تعذّر تحديد موقعك", "We couldn’t find your location")}</LocAlertTitle>
      <LocAlertDescription>{tr("اختر منطقتك أو حدّد موقعك على الخريطة لنرتّب المساحات حسب المسافة. ", "Choose your area or set your location on the map to sort the spaces by distance. ")}{PRIVACY_LINE}</LocAlertDescription>
      <LocAlertAction>{fallbacks}</LocAlertAction>
    </LocAlert>
  );
  if (loc.status === 'granted') {
    const from = loc.source === 'manual' ? tr("من الموقع الذي حدّدته على الخريطة", "from the point you set on the map") : tr("من موقعك", "from your location");
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
        <span>{sorting ? tr(`مرتبة حسب المسافة ${from}.`, `Sorted by distance ${from}.`) : tr(`المسافات ${from}.`, `Distances ${from}.`)}{tr(" المسافات تقريبية بخط مستقيم.", " Distances are approximate, in a straight line.")}</span>
        {privacy}
        <div className="flex flex-wrap gap-1">
          {loc.source === 'manual' && <LocButton variant="link" size="sm" onClick={onChangePick || startPick}>{tr("تغيير الموقع", "Change location")}</LocButton>}
          {sorting && <LocButton variant="link" size="sm" onClick={stop}>{tr("إيقاف الترتيب حسب المسافة", "Stop sorting by distance")}</LocButton>}
          {stop !== clear && <LocButton variant="link" size="sm" onClick={clear}>{tr("مسح موقعي", "Clear my location")}</LocButton>}
        </div>
      </div>
    );
  }
  return null;
}

Object.assign(window, { NearMeButton, LocationStatus });
