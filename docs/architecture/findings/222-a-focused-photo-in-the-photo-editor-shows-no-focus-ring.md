# 222. A focused photo in the photo editor shows no focus ring

**Status:** Open · **Date:** 2026-11-12

**Evidence:** the visual pass of the identity item (2026-11-12, Chrome, 1440, light and dark): on the owner's profile, «إدارة الصور» / *Manage photos*, a photo's picture is the sortable list's handle (`apps/web/src/features/spaces/components/photos/PhotosEdit.tsx`). Given the keyboard's focus, it draws the layer's ring (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`) outside its box, and the tile's frame in `PhotoTile.tsx` (`relative overflow-hidden rounded-lg border`, 257 × 146 around a 255 × 144 picture) clips all of it: the pixels 3 px outside the picture are the card's own ground. A keyboard user cannot see which photo has the focus before lifting it. Since #144 a lifted photo draws its spark edge inside the picture, so the lift shows; the focus alone does not.

**Resolves when:** a photo with the keyboard's focus shows a visible ring, in light and dark, seen in a browser.
