import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/** A wrapper with a fresh QueryClient made as the app makes its own, for rendering hooks that use it. */
export function queryWrapper() {
  const client = createQueryClient();
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
