# 184. A report's «تعديل الحقل» may not scroll to its section

**Status:** Open · **Date:** 2026-10-28

**Evidence:** a data report's sheet links «تعديل الحقل» to the space's editor with the field group's anchor (`#hours`, `#contacts`, `#location`, `#amenities`; `pages/dashboard/fieldSections.ts`, #129). The only thing that scrolls to an address's anchor is React Router's scroll restoration, which looks for the element once, as the navigation lands; the editor's cards (`ReadOnlyCard id="hours"` and the others in `features/spaces`) draw only once the space's read has answered, and no code of the editor reads `location.hash` on arrival. So, from a report about the hours, the profile probably opens at its top, not at «ساعات العمل», unless the space was already read. Plausible — not run in a browser; found by #129's review (R2-F4).

**Resolves when:** the space's editor, once its cards have drawn, scrolls to (and focuses) the card the address's anchor names, as the desk's uncollected card does for its own; or the browser shows the link already landing on its section.
