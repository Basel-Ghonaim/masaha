import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { MarkerMap } from '@shared/map';
import type { DirectoryMapView } from '../../types/DirectoryMapView';
import type { DirectorySlots } from '../../types/DirectorySlots';
import { FailureAlert } from '../list/FailureAlert';
import { MapLegend } from './MapLegend';
import { MapNotice } from './MapNotice';
import { PickCard } from './PickCard';
import { SelectedCard } from './SelectedCard';
import { SelectedSheet } from './SelectedSheet';

/**
 * The directory's map, a section named «الخريطة», marked busy while the pins load: a failure above
 * it, and over it the legend (at the top's end), the empty or no-match card, the line while the
 * pins first load and the one past their ceiling, the chosen space's card from 768 px (at the foot's start; a bottom sheet below it)
 * and «مركّز على موقعي» while a point is held, or, while a point is picked, the picking card in the
 * chosen space's place (under the map below 1024 px). Closing the chosen space, by «إغلاق» or
 * Escape, hands the focus back to its mark. The overlay precedes the marks in the tab order; below
 * 768 px, where the sheet takes no focus, a polite line says where the chosen space's details are.
 */
export function DirectoryMap({ view, slots }: { view: DirectoryMapView; slots: DirectorySlots }) {
  const { selected } = view;

  return (
    <section
      aria-label={view.region}
      aria-busy={view.busy}
      className="flex flex-col gap-3"
      onKeyDown={(event) => {
        // Escape on the map closes the card, as «إغلاق» does; the focus is on its mark already.
        // From the card itself, the card closes it and hands the focus back.
        if (event.key !== 'Escape' || event.defaultPrevented) return;
        if (selected !== null && !view.phone) selected.close();
      }}
    >
      {view.failure !== null && <FailureAlert failure={view.failure} />}
      <p role="status" className="sr-only">
        {view.announce}
      </p>
      <MarkerMap
        {...view.map}
        // Where the map is short, the picking card stands under it, so it never hides the crosshair.
        under={(controls) =>
          view.pick !== null && view.pickUnder ? <PickCard pick={view.pick} map={controls} /> : null
        }
        overlay={(controls) => {
          const close = () => {
            controls.focusSelected();
            selected?.close();
          };
          const nothing =
            view.state === 'noMatch' ? view.noMatch : view.state === 'empty' ? view.empty : null;
          const clear = view.state === 'noMatch' ? view.noMatch.clear : null;
          return (
            <div className="flex h-full flex-col justify-between gap-3 p-3 pb-8">
              <div className="flex justify-end">
                <MapLegend legend={view.legend} />
              </div>
              {nothing !== null && (
                <Card className="pointer-events-auto max-w-sm self-center">
                  <CardHeader>
                    <CardTitle>{nothing.title}</CardTitle>
                    <CardDescription>{nothing.text}</CardDescription>
                  </CardHeader>
                  {clear !== null && (
                    <CardContent>
                      <Button variant="outline" onClick={clear.run}>
                        {clear.label}
                      </Button>
                    </CardContent>
                  )}
                </Card>
              )}
              <div className="flex flex-col gap-3">
                {view.loading !== null && (
                  <div className="self-center">
                    <MapNotice line={view.loading} />
                  </div>
                )}
                {view.truncated !== null && (
                  <div className="self-center">
                    <MapNotice line={view.truncated} />
                  </div>
                )}
                <div className="flex items-end justify-between gap-3">
                  {view.pick !== null ? (
                    !view.pickUnder && <PickCard pick={view.pick} map={controls} />
                  ) : selected !== null && !view.phone ? (
                    <SelectedCard
                      selected={selected}
                      href={slots.spaceLink(selected.card.slug)}
                      areaName={slots.areaName(selected.card.areaId)}
                      onClose={close}
                    />
                  ) : (
                    <span />
                  )}
                  {view.centre !== null && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="pointer-events-auto"
                      onClick={controls.showUser}
                    >
                      {view.centre}
                    </Button>
                  )}
                </div>
              </div>
              {selected !== null && view.phone && (
                <SelectedSheet
                  selected={selected}
                  href={slots.spaceLink(selected.card.slug)}
                  areaName={slots.areaName(selected.card.areaId)}
                  onClose={close}
                />
              )}
            </div>
          );
        }}
      />
    </section>
  );
}
