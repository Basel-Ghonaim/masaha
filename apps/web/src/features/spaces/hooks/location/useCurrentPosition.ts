import { isInGazaStrip } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { MapPoint } from '@shared/map';
import { useState } from 'react';

/** How long the browser may take to find the owner: they are usually at the space (L2). */
const TIMEOUT_MS = 10_000;

/**
 * «استخدم موقعي الحالي» (L2, §4.2): the browser's position, asked precisely, moves the pin there
 * (`place`) when it lies in the Gaza Strip, said in a toast so the owner adjusts it; outside the Strip
 * the pin stays and the coordinates' field says so; refused, unavailable or too slow, a line says how
 * to go on. A browser with no geolocation draws no button.
 */
export function useCurrentPosition(place: (point: MapPoint) => void) {
  const words = useCopy().spaces.editor.location;
  const [result, setResult] = useState<'idle' | 'locating' | 'outside' | 'failed'>('idle');
  // Typed as always there, but an old browser or an unsecured page has none.
  const geolocation = navigator.geolocation as Geolocation | undefined;
  if (geolocation === undefined) return null;
  return {
    label: words.useMine,
    pending: result === 'locating',
    outside: result === 'outside' ? words.outside : null,
    failed: result === 'failed' ? words.locateFailed : null,
    run: () => {
      setResult('locating');
      geolocation.getCurrentPosition(
        ({ coords }) => {
          const point = { lat: coords.latitude, lng: coords.longitude };
          if (!isInGazaStrip(point)) {
            setResult('outside');
            return;
          }
          setResult('idle');
          place(point);
          toast(words.moved);
        },
        () => {
          setResult('failed');
        },
        { enableHighAccuracy: true, timeout: TIMEOUT_MS },
      );
    },
    /** A pin placed another way clears what the last ask said. */
    reset: () => {
      setResult('idle');
    },
  };
}
