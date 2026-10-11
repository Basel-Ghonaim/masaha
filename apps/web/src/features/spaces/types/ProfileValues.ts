/**
 * A space's profile as its form holds it: every text as typed, the area chosen or none, and the
 * pin as the coordinates' text, which the map writes and the admin may type or paste.
 */
export type ProfileValues = {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  areaId: number | null;
  addressAr: string;
  addressEn: string;
  landmarkAr: string;
  landmarkEn: string;
  location: string;
};
