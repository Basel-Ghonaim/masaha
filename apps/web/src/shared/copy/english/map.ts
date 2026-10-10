/**
 * The map's own words (shared/map): its attribution, its zoom buttons, the line when it cannot load,
 * and the pin's name. The attribution names the project as its licence asks, untranslated.
 */
export const MAP = {
  attribution: '© OpenStreetMap contributors',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  failed: 'The map didn’t load. Enter the coordinates instead.',
  pin: ({ point }: { point: string }) => `Pin at ${point}`,
} as const;
