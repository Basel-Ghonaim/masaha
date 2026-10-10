# Findings

> **Status:** Active · **Owner:** Basel Ghoneim
> **Authority:** Recorded divergences between the intended design and reality. A finding records a problem; it does not schedule work. An ADR records a decision; an Issue (when the owner creates one) tracks a task.

Each entry: number, title, status (`Open` / `Resolved` / `Accepted`), date, evidence, and what would resolve it. Numbers are never reused.

## How a finding is kept

- **One file per finding,** in this folder, named after its heading's anchor: `# 27. Two dashboard chunks import each other` is `27-two-dashboard-chunks-import-each-other.md`. A new finding takes the next free number in the range its Work Item's prompt gives, so two workers never take the same one ([workflow §9, Conflicts](../../development/workflow.md#conflicts)).
- **This index** lists each finding once, under the group of its status, by its number and its title only. Its *Resolves when* line lives in its own file.
- **A change of status** edits the finding's status line and moves it to its group here, in the same commit.

## Open

- [8. The stress test's applied-filter tag has no component](8-the-stress-tests-applied-filter-tag-has-no-component.md)
- [14. The owner's audit screen has no design](14-the-owners-audit-screen-has-no-design.md)
- [15. The payments migration predates ADR 0015](15-the-payments-migration-predates-adr-0015.md)
- [16. The forgotten password's timing can tell whether an account exists](16-the-forgotten-passwords-timing-can-tell-whether-an-account-exists.md)
- [17. Expired rate-limit counters and abandoned sessions are never swept](17-expired-rate-limit-counters-and-abandoned-sessions-are-never-swept.md)
- [20. A session has no absolute lifetime](20-a-session-has-no-absolute-lifetime.md)
- [21. A token replayed within the grace window starts its own branch](21-a-token-replayed-within-the-grace-window-starts-its-own-branch.md)
- [22. The reset email's words live outside the web's copy catalogue](22-the-reset-emails-words-live-outside-the-webs-copy-catalogue.md)
- [23. No per-address ceiling for signed-in requests](23-no-per-address-ceiling-for-signed-in-requests.md)
- [24. The status of each error type is written twice](24-the-status-of-each-error-type-is-written-twice.md)
- [25. The signed-in claims are read by a helper written twice](25-the-signed-in-claims-are-read-by-a-helper-written-twice.md)
- [27. Two dashboard chunks import each other](27-two-dashboard-chunks-import-each-other.md)
- [32. The Google sign-in answer does not say whether it created the account](32-the-google-sign-in-answer-does-not-say-whether-it-created-the-account.md)
- [33. The deployment's headers must let Google's sign-in work](33-the-deployments-headers-must-let-googles-sign-in-work.md)
- [35. The web sets no document title](35-the-web-sets-no-document-title.md)
- [39. The users service takes a parameter only its unit test passes](39-the-users-service-takes-a-parameter-only-its-unit-test-passes.md)
- [40. The platform's contact settings are outside the typed catalogue](40-the-platforms-contact-settings-are-outside-the-typed-catalogue.md)
- [42. A registration test failed once in a full component run](42-a-registration-test-failed-once-in-a-full-component-run.md)
- [43. Two races around a space's facts](43-two-races-around-a-spaces-facts.md)
- [44. No screen restores a deleted space once its toast has gone](44-no-screen-restores-a-deleted-space-once-its-toast-has-gone.md)
- [46. The deployment's headers must let the map's tiles load](46-the-deployments-headers-must-let-the-maps-tiles-load.md)
- [47. A dashboard test reads the top bar's title before the chosen page has loaded](47-a-dashboard-test-reads-the-top-bars-title-before-the-chosen-page-has-loaded.md)
- [48. `db:up` from another folder recreates the shared container](48-db-up-from-another-folder-recreates-the-shared-container.md)

## Accepted

- [5. In dark, the destructive badge reads louder than the other status badges](5-in-dark-the-destructive-badge-reads-louder-than-the-other-status-badges.md)
- [19. The reset email's colours, fonts and styles are written outside the design system](19-the-reset-emails-colours-fonts-and-styles-are-written-outside-the-design-system.md)
- [30. A lookup's English name is not unique](30-a-lookups-english-name-is-not-unique.md)

## Resolved

- [1. Overlays: the scrim has no token, and floating content shares the dropdown layer](1-overlays-the-scrim-has-no-token-and-floating-content-shares-the-dropdown-layer.md)
- [2. Copied shadcn components need more than the contract lists](2-copied-shadcn-components-need-more-than-the-contract-lists.md)
- [3. Classes used only by tests or the showcase reach the production CSS](3-classes-used-only-by-tests-or-the-showcase-reach-the-production-css.md)
- [4. Showcase sample text can clash with the app's text in `check:build`](4-showcase-sample-text-can-clash-with-the-apps-text-in-checkbuild.md)
- [6. Radix component tests failed once under load](6-radix-component-tests-failed-once-under-load.md)
- [7. The stress test's filter chips have no component](7-the-stress-tests-filter-chips-have-no-component.md)
- [9. Every Vitest lane fails when the working directory's drive letter is lowercase](9-every-vitest-lane-fails-when-the-working-directorys-drive-letter-is-lowercase.md)
- [10. The seeded amenity icon keys have no icons in the design system yet](10-the-seeded-amenity-icon-keys-have-no-icons-in-the-design-system-yet.md)
- [11. Nested writes in an interactive transaction trigger a `pg` deprecation warning](11-nested-writes-in-an-interactive-transaction-trigger-a-pg-deprecation-warning.md)
- [12. The admin's settings list a "default auto check-out" that the model has no place for](12-the-admins-settings-list-a-default-auto-check-out-that-the-model-has-no-place-for.md)
- [13. Two documents still say "member" for the renamed customer](13-two-documents-still-say-member-for-the-renamed-customer.md)
- [18. Whether a link to a deleted space still counts](18-whether-a-link-to-a-deleted-space-still-counts.md)
- [26. `npm run format -- --check` rewrites files](26-npm-run-format------check-rewrites-files.md)
- [28. The tests that wait for a lazy page can time out under load](28-the-tests-that-wait-for-a-lazy-page-can-time-out-under-load.md)
- [29. Two folders cannot each run the web against their own API](29-two-folders-cannot-each-run-the-web-against-their-own-api.md)
- [31. The backend documents still call for injecting a repository only tests pass](31-the-backend-documents-still-call-for-injecting-a-repository-only-tests-pass.md)
- [34. Passwords stay in the mutation cache after a sign-in, a registration or a password change](34-passwords-stay-in-the-mutation-cache-after-a-sign-in-a-registration-or-a-password-change.md)
- [36. A new space's empty fact groups count as fresh](36-a-new-spaces-empty-fact-groups-count-as-fresh.md)
- [37. Links between documents are checked by hand](37-links-between-documents-are-checked-by-hand.md)
- [38. The findings are one file](38-the-findings-are-one-file.md)
- [41. The request log does not name the space](41-the-request-log-does-not-name-the-space.md)
- [45. The data table's library reaches the site's first download](45-the-data-tables-library-reaches-the-sites-first-download.md)
