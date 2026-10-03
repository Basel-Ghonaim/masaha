import type { ReactNode } from 'react';

/** A status state's place on the page: a narrow column, centred in the space its shell leaves. */
export function StatusPage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 md:px-8">
      {children}
    </div>
  );
}
