import { useIsMutating } from '@tanstack/react-query';
import { authKeys } from './queryKeys';

/**
 * Whether a guest's sign-in is under way: signing in, registering, Google, or a reset link asked
 * for or asked again. A sign-in over the page holds its overlay open while it is (ADR 0021), so an
 * answer never arrives to a page the guest thought they had left.
 */
export function useSignInBusy(): boolean {
  return useIsMutating({ mutationKey: authKeys.signingIn }) > 0;
}
