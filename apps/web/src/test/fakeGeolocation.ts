import { vi } from 'vitest';

type Success = (position: {
  coords: { latitude: number; longitude: number; accuracy: number };
}) => void;

/**
 * The browser's geolocation, the platform's seam, stubbed on `navigator`: each ask is recorded and
 * answered by the test, `succeed` with a position or `fail`. `vi.unstubAllGlobals()` removes it.
 */
export function fakeGeolocation() {
  const asks: { success: Success; failure: () => void; options: unknown }[] = [];
  const geolocation = {
    getCurrentPosition: (success: Success, failure: () => void, options: unknown) => {
      asks.push({ success, failure, options });
    },
  };
  vi.stubGlobal('navigator', Object.assign(Object.create(navigator) as Navigator, { geolocation }));
  return {
    asks,
    succeed: (latitude: number, longitude: number, accuracy: number) => {
      asks.at(-1)?.success({ coords: { latitude, longitude, accuracy } });
    },
    fail: () => {
      asks.at(-1)?.failure();
    },
  };
}
