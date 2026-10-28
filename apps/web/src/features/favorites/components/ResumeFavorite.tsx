import { useResumeFavorite } from '../hooks/resume/useResumeFavorite';

/** Saves a guest's held favourite once they are back signed in; it renders nothing. */
export function ResumeFavorite({ manage }: { manage: () => void }) {
  useResumeFavorite({ manage });
  return null;
}
