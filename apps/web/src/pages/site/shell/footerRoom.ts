import { useEffect } from 'react';
import { useOutletContext } from 'react-router';

/** What the site's shell offers its pages through its outlet. */
export interface SiteOutletContext {
  reserveFooterRoom: (reserved: boolean) => void;
}

/**
 * Keeps the footer's room free under a bar fixed at the page's foot while `reserved`, and gives it
 * back when the page leaves.
 */
export function useFooterRoom(reserved: boolean): void {
  const { reserveFooterRoom } = useOutletContext<SiteOutletContext>();
  useEffect(() => {
    reserveFooterRoom(reserved);
    return () => {
      reserveFooterRoom(false);
    };
  }, [reserved, reserveFooterRoom]);
}
