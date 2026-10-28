# Favourites

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-28 · **Owner:** Basel Ghoneim
> **Authority:** The `favorites` capability: a signed-in user keeps the listed spaces they want to find again. Its endpoints are owned by the [API contract](../api/api-contract.md#favourites); its entity by the [data model](../architecture/data-model.md#operations). The API is built; on the web, the heart on the site's cards and on a space's page.
> **Scope:** the API module `favorites` (L2); `@masaha/shared/favorites`; the web feature `features/favorites`, any page group: the heart's save and removal, and a guest's held favourite.

## What it does

- Lets a signed-in user save a publicly listed space, at most 200, and remove one, listed or not.
- Answers a save of a space already saved, and a removal of one not saved, as done, writing nothing.
- Records which spaces a user saved, and when, for the directory, which answers them as its cards (`GET /me/favorites`, [directory](directory.md)).

## Who uses it

- **A signed-in user,** through the API: `POST` and `DELETE /me/favorites/:spaceId`; the list, `GET /me/favorites`, is the [directory](directory.md)'s. On the site, the heart on the Directory's and Home's cards and beside a space's name; a guest's press asks them to sign in first (2026-10-28, #129). The account's favourites are not built.

## Responsibility boundary

- **Owns** the `favorites` table and its ceiling (`FAVORITES_MAX`, 200).
- **Leaves** the list's cards, their order from a point and the names of the spaces that left to [`directory`](directory.md) ([conventions › Composed reads](../backend/conventions.md#composed-reads)).
- **Leaves** whether a space is publicly listed to the public listing of [`spaces`](spaces.md) (`publicListing.upTo`, with the areas [`lookups`](lookups.md) lists), as the directory lists it; the user's lock to [`users`](users.md) (`lockAccount`).

## How it composes the platform

- Its me router sits at `/me`, after the users' own, each route behind `requireAuth`; the path's id is read by `parseId` (a malformed one is `not_found`).

## Behaviour and flows

**Save.** Whether the space is publicly listed is read first, before the transaction (those reads are not the transaction's, [conventions §8](../backend/conventions.md#transactions)); then, in one transaction: the user's row locked (`users.lockAccount`, the session lock), so one user's saves are serialised; a space already saved is answered as it is, 204, writing nothing, even at the ceiling; a space the public listing did not list is `not_found`; a new one past 200 is `FAVORITES_LIMIT_REACHED`; else the favourite, dated by the one clock. Two saves at once: the second waits on the lock and finds the first; the primary key is the backstop. Two saves of different spaces at 199: the second finds 200.

**Remove.** The caller's row of that space deleted, if there is one, 204 either way: a space that left the directory is removed all the same.

**The heart on the web** (`FavoriteButton`, set by the site's Directory, Home and space pages in the directory's slots: over a card's cover, beside the card's link and never inside it, and beside the page's name). A toggle, the layer's icon button (44 × 44 on a coarse pointer), with one name, «حفظ {name} في المفضّلة», and pressed (`aria-pressed`, the heart filled) while the space is saved — a toggle keeps its name and its state says the rest (WAI-ARIA's button pattern; a departure from §9's two names, #129's review); whether it is saved is the directory's favourites, read once per signed-in visit. Pressed by a signed-in user, it flips at once and holds while its write is pending; the save or the removal is sent once, with no key. Done, the toast says «أُضيفت إلى المفضّلة» or «أُزيلت من المفضّلة» with the space's name under it and «تراجع», which sends the inverse once; the user's scope is read again, and the favourites then say the truth. Failed, the heart goes back and the toast says «تعذّر حفظ {name} في المفضّلة» or «تعذّرت إزالة {name} من المفضّلة» with «إعادة المحاولة»; a full list says `FAVORITES_LIMIT_REACHED`'s line with «إدارة المفضّلة», and a space gone «لم تعد هذه المساحة في الدليل.». A guest's press holds the favourite in memory and the page asks them to sign in, «سجّل الدخول لحفظ المساحات في المفضّلة», with «إنشاء حساب» and «تسجيل الدخول», each carrying the page as the one to return to; once they are back signed in, the site's shell saves it once and says «حُفظت {name} في المفضّلة» (a failure with «إعادة المحاولة»). Closing the sign-in lets the held favourite go, and so do 15 minutes or the guest landing on another page of the site.

**The list** (`directory`). The user's rows, newest saved first, then the higher space id first (at most 200); the public listing's cards of those it lists, with their live statuses, nearest first when the point is sent; the rest named by `spaces`, soft-deleted ones included, `listed: false`, after the listed ones when ordered by distance. A space restored or shown again is listed again: the row is kept.

## Decisions

### API decisions

- **At most 200 favourites, held under the user's lock** (`FAVORITES_LIMIT_REACHED`, S9). *Why:* the list is answered whole; two saves at 199 would otherwise both pass the count. 2026-10-25, #121.
- **Saving and removing are idempotent by design**: a space already saved, or one not saved, answers 204. *Why:* a heart tapped twice, or a retry after a lost answer, is no error ([conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)). The already-saved answer comes before the listing and the ceiling, so a saved space at 200 still answers 204. 2026-10-25, #121.
- **"Publicly listed" is asked of the public listing** (S12). *Why:* the rule already lives in the directory's queries; a copy would drift. 2026-10-25, #121.
- **Not audited.** *Why:* a person's own choice, no one else's record. 2026-10-25, #121.
- **The list is answered whole, with distance from the `Masaha-Near` header** (AC-014, Q9). *Why:* the screen shows every favourite at once, near me included, by the directory's privacy rules; a space that left stays, `listed: false`, so the user can remove it (C7). 2026-10-25, #121.

### Web decisions

- **The hearts read the saved spaces from the directory's favourites; the writes are `favorites`', which read the whole `['me']` scope again** (S13). *Why:* the only read that knows a favourite is `GET /me/favorites`, the directory's; a heart's write invalidates the scope that list sits in, as architecture §7 allows a write whose screen shows another capability's view. *Cost:* one request per signed-in visit to a page with cards, none for a guest. 2026-10-28, #129.
- **The heart is optimistic, and the only one** (architecture §7): pressed at once, held while its write is pending, put back on a failure; the favourites read again are the truth. 2026-10-28, #129.
- **One way for every heart: «تراجع» in the toast, a failure said with «إعادة المحاولة»** (DI-49). *Why:* the page's heart assumed success and skipped the undo; a heart pressed by mistake is undone where it is said. The undo runs outside the heart, so it still works once the heart has left the page. 2026-10-28, #129.
- **«المفضّلة», with the shadda, everywhere** (DI-50). 2026-10-28, #129.
- **The heart is the layer's icon button: 44 × 44 on a coarse pointer** (DI-51). 2026-10-28, #129.
- **A guest's favourite waits in memory, never in the address, and is saved on return by the site's shell** (S14, DI-61): a link carrying it would let a crafted link save a space for a signed-in user; closing the sign-in lets it go, and so do 15 minutes or the guest landing on another page of the site (the shell reports each page it shows: `noteSitePage`), so a later sign-in in the tab, maybe someone else's, saves nothing (#129's review). *Cost:* a reload, or a recovery by email, loses it ([finding 168](../architecture/findings/168-a-guests-intent-does-not-survive-a-password-recovery.md)). 2026-10-28, #129.
- **Sent once, with no key** (S4): a save or a removal is idempotent by design, and a lost answer is retried from its toast. 2026-10-28, #129.

## Code map

- `apps/api/src/modules/favorites/` — the module: its service, its repository and its me router.
- `packages/shared/src/favorites/` — the ceiling.
- **Web:** `apps/web/src/features/favorites/`, entry `index.ts` (`FavoriteButton`, `ResumeFavorite`), set by `pages/site/public/` (the Directory's, Home's and a space's page, through `useHeart`) and mounted by `pages/site/shell/SiteLayout.tsx`: the save and the removal in `repository/`; the write, its toasts and its read of the scope in `hooks/favoriteWrite.ts` and `components/toast/`; the heart's view in `hooks/toggle/`; a guest's held favourite in `hooks/intent/`, saved on return by `hooks/resume/`. Words: the catalogue's `favorites` section.

## Open findings

- [168. A guest's intent does not survive a password recovery](../architecture/findings/168-a-guests-intent-does-not-survive-a-password-recovery.md) — the favourite held for a guest is lost by a reload or a recovery by email.

## History

### API history

- #121 — a signed-in user's favourites saved and removed, idempotent, at most 200; read whole as the directory's cards, newest saved first or nearest first.
- #123 — the save reads the listing before it takes the user's lock (#121's review); a saved space that left, saved again, is tested.

### Web history

- 2026-10-28, #129 — the heart on the site's cards and beside a space's name: optimistic, «تراجع» and «إعادة المحاولة» in its toasts; a guest asked to sign in, the favourite held in memory and saved on return.
