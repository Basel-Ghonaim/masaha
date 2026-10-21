import { useState } from 'react';

/**
 * The space chosen on the map, by its pin's id: local to the map, and cleared when the filters
 * change (`filtersKey`), so a card never shows a space the new filters left out.
 */
export function useSelectedPin(filtersKey: string) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [seenKey, setSeenKey] = useState(filtersKey);
  if (seenKey !== filtersKey) {
    setSeenKey(filtersKey);
    setSelectedId(null);
  }
  return {
    selectedId,
    select: setSelectedId,
    close: () => {
      setSelectedId(null);
    },
  };
}
