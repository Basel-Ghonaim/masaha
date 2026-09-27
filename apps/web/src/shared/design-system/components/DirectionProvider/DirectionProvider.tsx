import type { ReactNode } from 'react';
import { Direction } from 'radix-ui';

type DirectionProviderProps = {
  dir: 'ltr' | 'rtl';
  children: ReactNode;
};

/**
 * Gives Radix-based components and the layer's icons the reading direction
 * (docs/frontend/design-system/foundation.md §8). The app mounts one at the root; a subtree shown
 * in the other direction nests its own.
 */
export function DirectionProvider({ dir, children }: DirectionProviderProps) {
  return <Direction.Provider dir={dir}>{children}</Direction.Provider>;
}

export const useDirection = Direction.useDirection;
