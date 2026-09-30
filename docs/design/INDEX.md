# Screen index (every frame of the design board)

Generated from `prototype/Flows - states.html`, in board order. Each row: the frame label, the prototype URL (open it with the static server, see README), the viewport, and its screenshot. Frames that repeat an earlier frame point to the same screenshot.

## 01 · Flow

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| 1 · Home | `Home.html?loc=none` | 390×844 | [01-flow/01-1-home.webp](screens/01-flow/01-1-home.webp) |
| 2 · Directory — list | `Directory.html?loc=none` | 390×844 | [01-flow/02-2-directory-list.webp](screens/01-flow/02-2-directory-list.webp) |
| 3 · Directory — map, marker tapped | `Directory.html?view=map&selected=focus&loc=none` | 390×844 | [01-flow/03-3-directory-map-marker-tapped.webp](screens/01-flow/03-3-directory-map-marker-tapped.webp) |
| 4 · Space details | `Space details.html?id=focus&loc=none` | 390×844 | [01-flow/04-4-space-details.webp](screens/01-flow/04-4-space-details.webp) |

## 02 · Home — states

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Default · «متاحة الآن» — desktop 1440 | `Home.html?loc=none` | 1440×1000 | [02-home-states/01-default-desktop-1440.webp](screens/02-home-states/01-default-desktop-1440.webp) |
| Default · «متاحة الآن» — phone 390 | `Home.html?loc=none` | 390×844 | [01-flow/01-1-home.webp](screens/01-flow/01-1-home.webp) |
| Location allowed · «الأقرب إليك» — desktop 1440 | `Home.html?loc=granted` | 1440×1000 | [02-home-states/03-location-allowed-desktop-1440.webp](screens/02-home-states/03-location-allowed-desktop-1440.webp) |
| Location allowed · «الأقرب إليك» — phone 390 | `Home.html?loc=granted` | 390×844 | [02-home-states/04-location-allowed-phone-390.webp](screens/02-home-states/04-location-allowed-phone-390.webp) |
| Location imprecise — desktop 1440 | `Home.html?loc=imprecise` | 1440×1000 | [02-home-states/05-location-imprecise-desktop-1440.webp](screens/02-home-states/05-location-imprecise-desktop-1440.webp) |
| Location imprecise — phone 390 | `Home.html?loc=imprecise` | 390×844 | [02-home-states/06-location-imprecise-phone-390.webp](screens/02-home-states/06-location-imprecise-phone-390.webp) |
| Loading — desktop 1440 | `Home.html?loc=none&state=loading` | 1440×1000 | [02-home-states/07-loading-desktop-1440.webp](screens/02-home-states/07-loading-desktop-1440.webp) |
| Loading — phone 390 | `Home.html?loc=none&state=loading` | 390×844 | [02-home-states/08-loading-phone-390.webp](screens/02-home-states/08-loading-phone-390.webp) |

## 03 · Directory — views & states

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| List — desktop 1440 | `Directory.html?loc=none` | 1440×1000 | [03-directory-views-states/01-list-desktop-1440.webp](screens/03-directory-views-states/01-list-desktop-1440.webp) |
| List — phone 390 | `Directory.html?loc=none` | 390×844 | [01-flow/02-2-directory-list.webp](screens/01-flow/02-2-directory-list.webp) |
| Map · marker tapped — desktop 1440 | `Directory.html?view=map&selected=focus&loc=none` | 1440×1000 | [03-directory-views-states/03-map-marker-tapped-desktop-1440.webp](screens/03-directory-views-states/03-map-marker-tapped-desktop-1440.webp) |
| Map · marker tapped — phone 390 | `Directory.html?view=map&selected=focus&loc=none` | 390×844 | [01-flow/03-3-directory-map-marker-tapped.webp](screens/01-flow/03-3-directory-map-marker-tapped.webp) |
| Location allowed · sorted «الأقرب إليّ» — desktop 1440 | `Directory.html?loc=granted` | 1440×1000 | [03-directory-views-states/05-location-allowed-sorted-desktop-1440.webp](screens/03-directory-views-states/05-location-allowed-sorted-desktop-1440.webp) |
| Location allowed · sorted «الأقرب إليّ» — phone 390 | `Directory.html?loc=granted` | 390×844 | [03-directory-views-states/06-location-allowed-sorted-phone-390.webp](screens/03-directory-views-states/06-location-allowed-sorted-phone-390.webp) |
| Location allowed · map — desktop 1440 | `Directory.html?view=map&loc=granted` | 1440×1000 | [03-directory-views-states/07-location-allowed-map-desktop-1440.webp](screens/03-directory-views-states/07-location-allowed-map-desktop-1440.webp) |
| Location allowed · map — phone 390 | `Directory.html?view=map&loc=granted` | 390×844 | [03-directory-views-states/08-location-allowed-map-phone-390.webp](screens/03-directory-views-states/08-location-allowed-map-phone-390.webp) |
| Location denied — desktop 1440 | `Directory.html?loc=denied` | 1440×1000 | [03-directory-views-states/09-location-denied-desktop-1440.webp](screens/03-directory-views-states/09-location-denied-desktop-1440.webp) |
| Location denied — phone 390 | `Directory.html?loc=denied` | 390×844 | [03-directory-views-states/10-location-denied-phone-390.webp](screens/03-directory-views-states/10-location-denied-phone-390.webp) |
| Location imprecise (outside Gaza / > 2 km) — desktop 1440 | `Directory.html?loc=imprecise` | 1440×1000 | [03-directory-views-states/11-location-imprecise-outside-gaza-2-km-desktop-1440.webp](screens/03-directory-views-states/11-location-imprecise-outside-gaza-2-km-desktop-1440.webp) |
| Location imprecise (outside Gaza / > 2 km) — phone 390 | `Directory.html?loc=imprecise` | 390×844 | [03-directory-views-states/12-location-imprecise-outside-gaza-2-km-phone-390.webp](screens/03-directory-views-states/12-location-imprecise-outside-gaza-2-km-phone-390.webp) |
| Manual pin · picking — desktop 1440 | `Directory.html?view=map&loc=picking` | 1440×1000 | [03-directory-views-states/13-manual-pin-picking-desktop-1440.webp](screens/03-directory-views-states/13-manual-pin-picking-desktop-1440.webp) |
| Manual pin · picking — phone 390 | `Directory.html?view=map&loc=picking` | 390×844 | [03-directory-views-states/14-manual-pin-picking-phone-390.webp](screens/03-directory-views-states/14-manual-pin-picking-phone-390.webp) |
| Manual pin · placed — desktop 1440 | `Directory.html?view=map&loc=manual` | 1440×1000 | [03-directory-views-states/15-manual-pin-placed-desktop-1440.webp](screens/03-directory-views-states/15-manual-pin-placed-desktop-1440.webp) |
| Manual pin · placed — phone 390 | `Directory.html?view=map&loc=manual` | 390×844 | [03-directory-views-states/16-manual-pin-placed-phone-390.webp](screens/03-directory-views-states/16-manual-pin-placed-phone-390.webp) |
| Manual pin · list sorted from pin — desktop 1440 | `Directory.html?loc=manual` | 1440×1000 | [03-directory-views-states/17-manual-pin-list-sorted-from-pin-desktop-1440.webp](screens/03-directory-views-states/17-manual-pin-list-sorted-from-pin-desktop-1440.webp) |
| Manual pin · list sorted from pin — phone 390 | `Directory.html?loc=manual` | 390×844 | [03-directory-views-states/18-manual-pin-list-sorted-from-pin-phone-390.webp](screens/03-directory-views-states/18-manual-pin-list-sorted-from-pin-phone-390.webp) |
| No results — desktop 1440 | `Directory.html?loc=none&demo=noresults` | 1440×1000 | [03-directory-views-states/19-no-results-desktop-1440.webp](screens/03-directory-views-states/19-no-results-desktop-1440.webp) |
| No results — phone 390 | `Directory.html?loc=none&demo=noresults` | 390×844 | [03-directory-views-states/20-no-results-phone-390.webp](screens/03-directory-views-states/20-no-results-phone-390.webp) |
| Filters sheet — desktop 1440 | `Directory.html?loc=none&sheet=filters` | 1440×1000 | [03-directory-views-states/21-filters-sheet-desktop-1440.webp](screens/03-directory-views-states/21-filters-sheet-desktop-1440.webp) |
| Filters sheet — phone 390 | `Directory.html?loc=none&sheet=filters` | 390×844 | [03-directory-views-states/22-filters-sheet-phone-390.webp](screens/03-directory-views-states/22-filters-sheet-phone-390.webp) |
| Loading — desktop 1440 | `Directory.html?loc=none&state=loading` | 1440×1000 | [03-directory-views-states/23-loading-desktop-1440.webp](screens/03-directory-views-states/23-loading-desktop-1440.webp) |
| Loading — phone 390 | `Directory.html?loc=none&state=loading` | 390×844 | [03-directory-views-states/24-loading-phone-390.webp](screens/03-directory-views-states/24-loading-phone-390.webp) |

## 04 · Space details — variants

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Focus Hub · verified, متاح, fresh, 5 photos, location allowed — desktop 1440 | `Space details.html?id=focus&loc=granted` | 1440×1000 | [04-space-details-variants/01-focus-hub-verified-fresh-5-photos-location-allowed-desktop-1.webp](screens/04-space-details-variants/01-focus-hub-verified-fresh-5-photos-location-allowed-desktop-1.webp) |
| Focus Hub · verified, متاح, fresh, 5 photos, location allowed — phone 390 | `Space details.html?id=focus&loc=granted` | 390×844 | [04-space-details-variants/02-focus-hub-verified-fresh-5-photos-location-allowed-phone-390.webp](screens/04-space-details-variants/02-focus-hub-verified-fresh-5-photos-location-allowed-phone-390.webp) |
| Focus Hub · verified + stale price (40 days) — desktop 1440 | `Space details.html?id=focus&loc=none&demo=stale` | 1440×1000 | [04-space-details-variants/03-focus-hub-verified-stale-price-40-days-desktop-1440.webp](screens/04-space-details-variants/03-focus-hub-verified-stale-price-40-days-desktop-1440.webp) |
| Focus Hub · verified + stale price (40 days) — phone 390 | `Space details.html?id=focus&loc=none&demo=stale` | 390×844 | [04-space-details-variants/04-focus-hub-verified-stale-price-40-days-phone-390.webp](screens/04-space-details-variants/04-focus-hub-verified-stale-price-40-days-phone-390.webp) |
| Branch Hub · ممتلئ, shifts + per-shift prices, 3 photos — desktop 1440 | `Space details.html?id=branch&loc=none` | 1440×1000 | [04-space-details-variants/05-branch-hub-shifts-per-shift-prices-3-photos-desktop-1440.webp](screens/04-space-details-variants/05-branch-hub-shifts-per-shift-prices-3-photos-desktop-1440.webp) |
| Branch Hub · ممتلئ, shifts + per-shift prices, 3 photos — phone 390 | `Space details.html?id=branch&loc=none` | 390×844 | [04-space-details-variants/06-branch-hub-shifts-per-shift-prices-3-photos-phone-390.webp](screens/04-space-details-variants/06-branch-hub-shifts-per-shift-prices-3-photos-phone-390.webp) |
| Golden Hub · unverified, stale price, no photos — desktop 1440 | `Space details.html?id=golden&loc=none` | 1440×1000 | [04-space-details-variants/07-golden-hub-unverified-stale-price-no-photos-desktop-1440.webp](screens/04-space-details-variants/07-golden-hub-unverified-stale-price-no-photos-desktop-1440.webp) |
| Golden Hub · unverified, stale price, no photos — phone 390 | `Space details.html?id=golden&loc=none` | 390×844 | [04-space-details-variants/08-golden-hub-unverified-stale-price-no-photos-phone-390.webp](screens/04-space-details-variants/08-golden-hub-unverified-stale-price-no-photos-phone-390.webp) |
| Number One Hub · closure banner, مغلق الآن, 2 photos — desktop 1440 | `Space details.html?id=numberone&loc=none` | 1440×1000 | [04-space-details-variants/09-number-one-hub-closure-banner-2-photos-desktop-1440.webp](screens/04-space-details-variants/09-number-one-hub-closure-banner-2-photos-desktop-1440.webp) |
| Number One Hub · closure banner, مغلق الآن, 2 photos — phone 390 | `Space details.html?id=numberone&loc=none` | 390×844 | [04-space-details-variants/10-number-one-hub-closure-banner-2-photos-phone-390.webp](screens/04-space-details-variants/10-number-one-hub-closure-banner-2-photos-phone-390.webp) |
| White Space · unverified, 1 photo — desktop 1440 | `Space details.html?id=white&loc=none` | 1440×1000 | [04-space-details-variants/11-white-space-unverified-1-photo-desktop-1440.webp](screens/04-space-details-variants/11-white-space-unverified-1-photo-desktop-1440.webp) |
| White Space · unverified, 1 photo — phone 390 | `Space details.html?id=white&loc=none` | 390×844 | [04-space-details-variants/12-white-space-unverified-1-photo-phone-390.webp](screens/04-space-details-variants/12-white-space-unverified-1-photo-phone-390.webp) |
| Signed out · heart → sign-in dialog — desktop 1440 | `Space details.html?id=focus&loc=none&dialog=signin` | 1440×1000 | [04-space-details-variants/13-signed-out-heart-sign-in-dialog-desktop-1440.webp](screens/04-space-details-variants/13-signed-out-heart-sign-in-dialog-desktop-1440.webp) |
| Signed out · heart → sign-in dialog — phone 390 | `Space details.html?id=focus&loc=none&dialog=signin` | 390×844 | [04-space-details-variants/14-signed-out-heart-sign-in-dialog-phone-390.webp](screens/04-space-details-variants/14-signed-out-heart-sign-in-dialog-phone-390.webp) |
| Signed in · report wrong info — desktop 1440 | `Space details.html?id=focus&loc=none&auth=1&dialog=report` | 1440×1000 | [04-space-details-variants/15-signed-in-report-wrong-info-desktop-1440.webp](screens/04-space-details-variants/15-signed-in-report-wrong-info-desktop-1440.webp) |
| Signed in · report wrong info — phone 390 | `Space details.html?id=focus&loc=none&auth=1&dialog=report` | 390×844 | [04-space-details-variants/16-signed-in-report-wrong-info-phone-390.webp](screens/04-space-details-variants/16-signed-in-report-wrong-info-phone-390.webp) |
| Space not found / hidden — desktop 1440 | `Space details.html?id=focus&loc=none&state=notfound` | 1440×1000 | [04-space-details-variants/17-space-not-found-hidden-desktop-1440.webp](screens/04-space-details-variants/17-space-not-found-hidden-desktop-1440.webp) |
| Space not found / hidden — phone 390 | `Space details.html?id=focus&loc=none&state=notfound` | 390×844 | [04-space-details-variants/18-space-not-found-hidden-phone-390.webp](screens/04-space-details-variants/18-space-not-found-hidden-phone-390.webp) |
| Loading — desktop 1440 | `Space details.html?id=focus&loc=none&state=loading` | 1440×1000 | [04-space-details-variants/19-loading-desktop-1440.webp](screens/04-space-details-variants/19-loading-desktop-1440.webp) |
| Loading — phone 390 | `Space details.html?id=focus&loc=none&state=loading` | 390×844 | [04-space-details-variants/20-loading-phone-390.webp](screens/04-space-details-variants/20-loading-phone-390.webp) |

## 05 · Auth flow

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| 1 · Heart → sign-in dialog | `Space details.html?id=focus&loc=none&dialog=signin` | 390×844 | [04-space-details-variants/14-signed-out-heart-sign-in-dialog-phone-390.webp](screens/04-space-details-variants/14-signed-out-heart-sign-in-dialog-phone-390.webp) |
| 2 · Register | `Register.html?next=Space details.html?id=focus&auth=1&fav=1` | 390×844 | [05-auth-flow/02-2-register.webp](screens/05-auth-flow/02-2-register.webp) |
| 3 · Back on the space · toast | `Space details.html?id=focus&loc=none&auth=1&fav=1&toast=welcome` | 390×844 | [05-auth-flow/03-3-back-on-the-space-toast.webp](screens/05-auth-flow/03-3-back-on-the-space-toast.webp) |

## 06 · Sign in

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Sign in · default — desktop 1440 | `Sign in.html` | 1440×1000 | [06-sign-in/01-sign-in-default-desktop-1440.webp](screens/06-sign-in/01-sign-in-default-desktop-1440.webp) |
| Sign in · default — phone 390 | `Sign in.html` | 390×844 | [06-sign-in/02-sign-in-default-phone-390.webp](screens/06-sign-in/02-sign-in-default-phone-390.webp) |
| Sign in · Google error — desktop 1440 | `Sign in.html?google=error` | 1440×1000 | [06-sign-in/03-sign-in-google-error-desktop-1440.webp](screens/06-sign-in/03-sign-in-google-error-desktop-1440.webp) |
| Sign in · Google error — phone 390 | `Sign in.html?google=error` | 390×844 | [06-sign-in/04-sign-in-google-error-phone-390.webp](screens/06-sign-in/04-sign-in-google-error-phone-390.webp) |
| Sign in · wrong password — desktop 1440 | `Sign in.html?state=error` | 1440×1000 | [06-sign-in/05-sign-in-wrong-password-desktop-1440.webp](screens/06-sign-in/05-sign-in-wrong-password-desktop-1440.webp) |
| Sign in · wrong password — phone 390 | `Sign in.html?state=error` | 390×844 | [06-sign-in/06-sign-in-wrong-password-phone-390.webp](screens/06-sign-in/06-sign-in-wrong-password-phone-390.webp) |
| Sign in · too many attempts — desktop 1440 | `Sign in.html?state=ratelimit` | 1440×1000 | [06-sign-in/07-sign-in-too-many-attempts-desktop-1440.webp](screens/06-sign-in/07-sign-in-too-many-attempts-desktop-1440.webp) |
| Sign in · too many attempts — phone 390 | `Sign in.html?state=ratelimit` | 390×844 | [06-sign-in/08-sign-in-too-many-attempts-phone-390.webp](screens/06-sign-in/08-sign-in-too-many-attempts-phone-390.webp) |
| After Google · accounts linked (toast) — desktop 1440 | `Home.html?loc=none&toast=linked` | 1440×1000 | [06-sign-in/09-after-google-accounts-linked-toast-desktop-1440.webp](screens/06-sign-in/09-after-google-accounts-linked-toast-desktop-1440.webp) |
| After Google · accounts linked (toast) — phone 390 | `Home.html?loc=none&toast=linked` | 390×844 | [06-sign-in/10-after-google-accounts-linked-toast-phone-390.webp](screens/06-sign-in/10-after-google-accounts-linked-toast-phone-390.webp) |

## 07 · Register «إنشاء حساب»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Register · default — desktop 1440 | `Register.html` | 1440×1000 | [07-register/01-register-default-desktop-1440.webp](screens/07-register/01-register-default-desktop-1440.webp) |
| Register · default — phone 390 | `Register.html` | 390×844 | [07-register/02-register-default-phone-390.webp](screens/07-register/02-register-default-phone-390.webp) |
| Register · typing (rules ticking) — desktop 1440 | `Register.html?state=typing` | 1440×1000 | [07-register/03-register-typing-rules-ticking-desktop-1440.webp](screens/07-register/03-register-typing-rules-ticking-desktop-1440.webp) |
| Register · typing (rules ticking) — phone 390 | `Register.html?state=typing` | 390×844 | [07-register/04-register-typing-rules-ticking-phone-390.webp](screens/07-register/04-register-typing-rules-ticking-phone-390.webp) |
| Register · field errors — desktop 1440 | `Register.html?state=errors` | 1440×1000 | [07-register/05-register-field-errors-desktop-1440.webp](screens/07-register/05-register-field-errors-desktop-1440.webp) |
| Register · field errors — phone 390 | `Register.html?state=errors` | 390×844 | [07-register/06-register-field-errors-phone-390.webp](screens/07-register/06-register-field-errors-phone-390.webp) |
| Register · email already registered — desktop 1440 | `Register.html?state=exists` | 1440×1000 | [07-register/07-register-email-already-registered-desktop-1440.webp](screens/07-register/07-register-email-already-registered-desktop-1440.webp) |
| Register · email already registered — phone 390 | `Register.html?state=exists` | 390×844 | [07-register/08-register-email-already-registered-phone-390.webp](screens/07-register/08-register-email-already-registered-phone-390.webp) |
| Register · too many attempts — desktop 1440 | `Register.html?state=ratelimit` | 1440×1000 | [07-register/09-register-too-many-attempts-desktop-1440.webp](screens/07-register/09-register-too-many-attempts-desktop-1440.webp) |
| Register · too many attempts — phone 390 | `Register.html?state=ratelimit` | 390×844 | [07-register/10-register-too-many-attempts-phone-390.webp](screens/07-register/10-register-too-many-attempts-phone-390.webp) |
| Register · network error — desktop 1440 | `Register.html?state=network` | 1440×1000 | [07-register/11-register-network-error-desktop-1440.webp](screens/07-register/11-register-network-error-desktop-1440.webp) |
| Register · network error — phone 390 | `Register.html?state=network` | 390×844 | [07-register/12-register-network-error-phone-390.webp](screens/07-register/12-register-network-error-phone-390.webp) |
| Register · submitting — desktop 1440 | `Register.html?state=loading` | 1440×1000 | [07-register/13-register-submitting-desktop-1440.webp](screens/07-register/13-register-submitting-desktop-1440.webp) |
| Register · submitting — phone 390 | `Register.html?state=loading` | 390×844 | [07-register/14-register-submitting-phone-390.webp](screens/07-register/14-register-submitting-phone-390.webp) |
| Register · Google error — desktop 1440 | `Register.html?google=error` | 1440×1000 | [07-register/15-register-google-error-desktop-1440.webp](screens/07-register/15-register-google-error-desktop-1440.webp) |
| Register · Google error — phone 390 | `Register.html?google=error` | 390×844 | [07-register/16-register-google-error-phone-390.webp](screens/07-register/16-register-google-error-phone-390.webp) |

## 08 · Forgot & reset password

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Forgot · default — desktop 1440 | `Forgot password.html` | 1440×1000 | [08-forgot-reset-password/01-forgot-default-desktop-1440.webp](screens/08-forgot-reset-password/01-forgot-default-desktop-1440.webp) |
| Forgot · default — phone 390 | `Forgot password.html` | 390×844 | [08-forgot-reset-password/02-forgot-default-phone-390.webp](screens/08-forgot-reset-password/02-forgot-default-phone-390.webp) |
| Forgot · sent (60s countdown) — desktop 1440 | `Forgot password.html?state=sent` | 1440×1000 | [08-forgot-reset-password/03-forgot-sent-60s-countdown-desktop-1440.webp](screens/08-forgot-reset-password/03-forgot-sent-60s-countdown-desktop-1440.webp) |
| Forgot · sent (60s countdown) — phone 390 | `Forgot password.html?state=sent` | 390×844 | [08-forgot-reset-password/04-forgot-sent-60s-countdown-phone-390.webp](screens/08-forgot-reset-password/04-forgot-sent-60s-countdown-phone-390.webp) |
| Forgot · too many attempts — desktop 1440 | `Forgot password.html?state=ratelimit` | 1440×1000 | [08-forgot-reset-password/05-forgot-too-many-attempts-desktop-1440.webp](screens/08-forgot-reset-password/05-forgot-too-many-attempts-desktop-1440.webp) |
| Forgot · too many attempts — phone 390 | `Forgot password.html?state=ratelimit` | 390×844 | [08-forgot-reset-password/06-forgot-too-many-attempts-phone-390.webp](screens/08-forgot-reset-password/06-forgot-too-many-attempts-phone-390.webp) |
| Reset · new password — desktop 1440 | `Reset password.html?state=typing` | 1440×1000 | [08-forgot-reset-password/07-reset-new-password-desktop-1440.webp](screens/08-forgot-reset-password/07-reset-new-password-desktop-1440.webp) |
| Reset · new password — phone 390 | `Reset password.html?state=typing` | 390×844 | [08-forgot-reset-password/08-reset-new-password-phone-390.webp](screens/08-forgot-reset-password/08-reset-new-password-phone-390.webp) |
| Reset · link expired or used — desktop 1440 | `Reset password.html?state=invalid` | 1440×1000 | [08-forgot-reset-password/09-reset-link-expired-or-used-desktop-1440.webp](screens/08-forgot-reset-password/09-reset-link-expired-or-used-desktop-1440.webp) |
| Reset · link expired or used — phone 390 | `Reset password.html?state=invalid` | 390×844 | [08-forgot-reset-password/10-reset-link-expired-or-used-phone-390.webp](screens/08-forgot-reset-password/10-reset-link-expired-or-used-phone-390.webp) |
| Reset · success — desktop 1440 | `Reset password.html?state=success` | 1440×1000 | [08-forgot-reset-password/11-reset-success-desktop-1440.webp](screens/08-forgot-reset-password/11-reset-success-desktop-1440.webp) |
| Reset · success — phone 390 | `Reset password.html?state=success` | 390×844 | [08-forgot-reset-password/12-reset-success-phone-390.webp](screens/08-forgot-reset-password/12-reset-success-phone-390.webp) |

## 09 · Reset email

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Reset email — desktop | `Reset email.html` | 720×760 | [09-reset-email/01-reset-email-desktop.webp](screens/09-reset-email/01-reset-email-desktop.webp) |
| Reset email — phone 390 | `Reset email.html` | 390×844 | [09-reset-email/02-reset-email-phone-390.webp](screens/09-reset-email/02-reset-email-phone-390.webp) |

## 10 · About & error pages

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| About «عن مساحة» — desktop 1440 | `About.html` | 1440×1000 | [10-about-error-pages/01-about-desktop-1440.webp](screens/10-about-error-pages/01-about-desktop-1440.webp) |
| About «عن مساحة» — phone 390 | `About.html` | 390×844 | [10-about-error-pages/02-about-phone-390.webp](screens/10-about-error-pages/02-about-phone-390.webp) |
| 404 — desktop 1440 | `Error.html?type=404` | 1440×1000 | [10-about-error-pages/03-404-desktop-1440.webp](screens/10-about-error-pages/03-404-desktop-1440.webp) |
| 404 — phone 390 | `Error.html?type=404` | 390×844 | [10-about-error-pages/04-404-phone-390.webp](screens/10-about-error-pages/04-404-phone-390.webp) |
| General error — desktop 1440 | `Error.html?type=error` | 1440×1000 | [10-about-error-pages/05-general-error-desktop-1440.webp](screens/10-about-error-pages/05-general-error-desktop-1440.webp) |
| General error — phone 390 | `Error.html?type=error` | 390×844 | [10-about-error-pages/06-general-error-phone-390.webp](screens/10-about-error-pages/06-general-error-phone-390.webp) |
| Offline — desktop 1440 | `Error.html?type=offline` | 1440×1000 | [10-about-error-pages/07-offline-desktop-1440.webp](screens/10-about-error-pages/07-offline-desktop-1440.webp) |
| Offline — phone 390 | `Error.html?type=offline` | 390×844 | [10-about-error-pages/08-offline-phone-390.webp](screens/10-about-error-pages/08-offline-phone-390.webp) |

## 11 · Variants

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Home — AR light · desktop 1440 | `Home.html?loc=none` | 1440×900 | [02-home-states/01-default-desktop-1440.webp](screens/02-home-states/01-default-desktop-1440.webp) |
| Home — AR dark · desktop 1440 | `Home.html?loc=none&theme=dark` | 1440×900 | [11-variants/02-home-ar-dark-desktop-1440.webp](screens/11-variants/02-home-ar-dark-desktop-1440.webp) |
| Home — EN light · desktop 1440 | `Home.html?loc=none&lang=en` | 1440×900 | [11-variants/03-home-en-light-desktop-1440.webp](screens/11-variants/03-home-en-light-desktop-1440.webp) |
| Home — EN dark · desktop 1440 | `Home.html?loc=none&lang=en&theme=dark` | 1440×900 | [11-variants/04-home-en-dark-desktop-1440.webp](screens/11-variants/04-home-en-dark-desktop-1440.webp) |
| Directory · list — AR light · desktop 1440 | `Directory.html?loc=none` | 1440×900 | [03-directory-views-states/01-list-desktop-1440.webp](screens/03-directory-views-states/01-list-desktop-1440.webp) |
| Directory · list — AR dark · desktop 1440 | `Directory.html?loc=none&theme=dark` | 1440×900 | [11-variants/06-directory-list-ar-dark-desktop-1440.webp](screens/11-variants/06-directory-list-ar-dark-desktop-1440.webp) |
| Directory · list — EN light · desktop 1440 | `Directory.html?loc=none&lang=en` | 1440×900 | [11-variants/07-directory-list-en-light-desktop-1440.webp](screens/11-variants/07-directory-list-en-light-desktop-1440.webp) |
| Directory · list — EN dark · desktop 1440 | `Directory.html?loc=none&lang=en&theme=dark` | 1440×900 | [11-variants/08-directory-list-en-dark-desktop-1440.webp](screens/11-variants/08-directory-list-en-dark-desktop-1440.webp) |
| Directory · map — AR light · desktop 1440 | `Directory.html?view=map&selected=focus&loc=none` | 1440×900 | [03-directory-views-states/03-map-marker-tapped-desktop-1440.webp](screens/03-directory-views-states/03-map-marker-tapped-desktop-1440.webp) |
| Directory · map — AR dark · desktop 1440 | `Directory.html?view=map&selected=focus&loc=none&theme=dark` | 1440×900 | [11-variants/10-directory-map-ar-dark-desktop-1440.webp](screens/11-variants/10-directory-map-ar-dark-desktop-1440.webp) |
| Directory · map — EN light · desktop 1440 | `Directory.html?view=map&selected=focus&loc=none&lang=en` | 1440×900 | [11-variants/11-directory-map-en-light-desktop-1440.webp](screens/11-variants/11-directory-map-en-light-desktop-1440.webp) |
| Directory · map — EN dark · desktop 1440 | `Directory.html?view=map&selected=focus&loc=none&lang=en&theme=dark` | 1440×900 | [11-variants/12-directory-map-en-dark-desktop-1440.webp](screens/11-variants/12-directory-map-en-dark-desktop-1440.webp) |
| Space details — AR light · desktop 1440 | `Space details.html?id=focus&loc=granted` | 1440×900 | [04-space-details-variants/01-focus-hub-verified-fresh-5-photos-location-allowed-desktop-1.webp](screens/04-space-details-variants/01-focus-hub-verified-fresh-5-photos-location-allowed-desktop-1.webp) |
| Space details — AR dark · desktop 1440 | `Space details.html?id=focus&loc=granted&theme=dark` | 1440×900 | [11-variants/14-space-details-ar-dark-desktop-1440.webp](screens/11-variants/14-space-details-ar-dark-desktop-1440.webp) |
| Space details — EN light · desktop 1440 | `Space details.html?id=focus&loc=granted&lang=en` | 1440×900 | [11-variants/15-space-details-en-light-desktop-1440.webp](screens/11-variants/15-space-details-en-light-desktop-1440.webp) |
| Space details — EN dark · desktop 1440 | `Space details.html?id=focus&loc=granted&lang=en&theme=dark` | 1440×900 | [11-variants/16-space-details-en-dark-desktop-1440.webp](screens/11-variants/16-space-details-en-dark-desktop-1440.webp) |
| Sign in — AR light · desktop 1440 | `Sign in.html` | 1440×900 | [06-sign-in/01-sign-in-default-desktop-1440.webp](screens/06-sign-in/01-sign-in-default-desktop-1440.webp) |
| Sign in — AR dark · desktop 1440 | `Sign in.html?theme=dark` | 1440×900 | [11-variants/18-sign-in-ar-dark-desktop-1440.webp](screens/11-variants/18-sign-in-ar-dark-desktop-1440.webp) |
| Sign in — EN light · desktop 1440 | `Sign in.html?lang=en` | 1440×900 | [11-variants/19-sign-in-en-light-desktop-1440.webp](screens/11-variants/19-sign-in-en-light-desktop-1440.webp) |
| Sign in — EN dark · desktop 1440 | `Sign in.html?lang=en&theme=dark` | 1440×900 | [11-variants/20-sign-in-en-dark-desktop-1440.webp](screens/11-variants/20-sign-in-en-dark-desktop-1440.webp) |
| Register — AR light · desktop 1440 | `Register.html?state=filled` | 1440×900 | [11-variants/21-register-ar-light-desktop-1440.webp](screens/11-variants/21-register-ar-light-desktop-1440.webp) |
| Register — AR dark · desktop 1440 | `Register.html?state=filled&theme=dark` | 1440×900 | [11-variants/22-register-ar-dark-desktop-1440.webp](screens/11-variants/22-register-ar-dark-desktop-1440.webp) |
| Register — EN light · desktop 1440 | `Register.html?state=filled&lang=en` | 1440×900 | [11-variants/23-register-en-light-desktop-1440.webp](screens/11-variants/23-register-en-light-desktop-1440.webp) |
| Register — EN dark · desktop 1440 | `Register.html?state=filled&lang=en&theme=dark` | 1440×900 | [11-variants/24-register-en-dark-desktop-1440.webp](screens/11-variants/24-register-en-dark-desktop-1440.webp) |
| Forgot password — AR light · desktop 1440 | `Forgot password.html` | 1440×900 | [08-forgot-reset-password/01-forgot-default-desktop-1440.webp](screens/08-forgot-reset-password/01-forgot-default-desktop-1440.webp) |
| Forgot password — AR dark · desktop 1440 | `Forgot password.html?theme=dark` | 1440×900 | [11-variants/26-forgot-password-ar-dark-desktop-1440.webp](screens/11-variants/26-forgot-password-ar-dark-desktop-1440.webp) |
| Forgot password — EN light · desktop 1440 | `Forgot password.html?lang=en` | 1440×900 | [11-variants/27-forgot-password-en-light-desktop-1440.webp](screens/11-variants/27-forgot-password-en-light-desktop-1440.webp) |
| Forgot password — EN dark · desktop 1440 | `Forgot password.html?lang=en&theme=dark` | 1440×900 | [11-variants/28-forgot-password-en-dark-desktop-1440.webp](screens/11-variants/28-forgot-password-en-dark-desktop-1440.webp) |
| Reset password — AR light · desktop 1440 | `Reset password.html?state=typing` | 1440×900 | [08-forgot-reset-password/07-reset-new-password-desktop-1440.webp](screens/08-forgot-reset-password/07-reset-new-password-desktop-1440.webp) |
| Reset password — AR dark · desktop 1440 | `Reset password.html?state=typing&theme=dark` | 1440×900 | [11-variants/30-reset-password-ar-dark-desktop-1440.webp](screens/11-variants/30-reset-password-ar-dark-desktop-1440.webp) |
| Reset password — EN light · desktop 1440 | `Reset password.html?state=typing&lang=en` | 1440×900 | [11-variants/31-reset-password-en-light-desktop-1440.webp](screens/11-variants/31-reset-password-en-light-desktop-1440.webp) |
| Reset password — EN dark · desktop 1440 | `Reset password.html?state=typing&lang=en&theme=dark` | 1440×900 | [11-variants/32-reset-password-en-dark-desktop-1440.webp](screens/11-variants/32-reset-password-en-dark-desktop-1440.webp) |
| About — AR light · desktop 1440 | `About.html` | 1440×900 | [10-about-error-pages/01-about-desktop-1440.webp](screens/10-about-error-pages/01-about-desktop-1440.webp) |
| About — AR dark · desktop 1440 | `About.html?theme=dark` | 1440×900 | [11-variants/34-about-ar-dark-desktop-1440.webp](screens/11-variants/34-about-ar-dark-desktop-1440.webp) |
| About — EN light · desktop 1440 | `About.html?lang=en` | 1440×900 | [11-variants/35-about-en-light-desktop-1440.webp](screens/11-variants/35-about-en-light-desktop-1440.webp) |
| About — EN dark · desktop 1440 | `About.html?lang=en&theme=dark` | 1440×900 | [11-variants/36-about-en-dark-desktop-1440.webp](screens/11-variants/36-about-en-dark-desktop-1440.webp) |
| 404 — AR light · desktop 1440 | `Error.html?type=404` | 1440×900 | [10-about-error-pages/03-404-desktop-1440.webp](screens/10-about-error-pages/03-404-desktop-1440.webp) |
| 404 — AR dark · desktop 1440 | `Error.html?type=404&theme=dark` | 1440×900 | [11-variants/38-404-ar-dark-desktop-1440.webp](screens/11-variants/38-404-ar-dark-desktop-1440.webp) |
| 404 — EN light · desktop 1440 | `Error.html?type=404&lang=en` | 1440×900 | [11-variants/39-404-en-light-desktop-1440.webp](screens/11-variants/39-404-en-light-desktop-1440.webp) |
| 404 — EN dark · desktop 1440 | `Error.html?type=404&lang=en&theme=dark` | 1440×900 | [11-variants/40-404-en-dark-desktop-1440.webp](screens/11-variants/40-404-en-dark-desktop-1440.webp) |
| General error — AR light · desktop 1440 | `Error.html?type=error` | 1440×900 | [10-about-error-pages/05-general-error-desktop-1440.webp](screens/10-about-error-pages/05-general-error-desktop-1440.webp) |
| General error — AR dark · desktop 1440 | `Error.html?type=error&theme=dark` | 1440×900 | [11-variants/42-general-error-ar-dark-desktop-1440.webp](screens/11-variants/42-general-error-ar-dark-desktop-1440.webp) |
| General error — EN light · desktop 1440 | `Error.html?type=error&lang=en` | 1440×900 | [11-variants/43-general-error-en-light-desktop-1440.webp](screens/11-variants/43-general-error-en-light-desktop-1440.webp) |
| General error — EN dark · desktop 1440 | `Error.html?type=error&lang=en&theme=dark` | 1440×900 | [11-variants/44-general-error-en-dark-desktop-1440.webp](screens/11-variants/44-general-error-en-dark-desktop-1440.webp) |
| Offline — AR light · desktop 1440 | `Error.html?type=offline` | 1440×900 | [10-about-error-pages/07-offline-desktop-1440.webp](screens/10-about-error-pages/07-offline-desktop-1440.webp) |
| Offline — AR dark · desktop 1440 | `Error.html?type=offline&theme=dark` | 1440×900 | [11-variants/46-offline-ar-dark-desktop-1440.webp](screens/11-variants/46-offline-ar-dark-desktop-1440.webp) |
| Offline — EN light · desktop 1440 | `Error.html?type=offline&lang=en` | 1440×900 | [11-variants/47-offline-en-light-desktop-1440.webp](screens/11-variants/47-offline-en-light-desktop-1440.webp) |
| Offline — EN dark · desktop 1440 | `Error.html?type=offline&lang=en&theme=dark` | 1440×900 | [11-variants/48-offline-en-dark-desktop-1440.webp](screens/11-variants/48-offline-en-dark-desktop-1440.webp) |

## 12 · Variants — phone 390

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Home — AR light · phone 390 | `Home.html?loc=none` | 390×844 | [01-flow/01-1-home.webp](screens/01-flow/01-1-home.webp) |
| Home — AR dark · phone 390 | `Home.html?loc=none&theme=dark` | 390×844 | [12-variants-phone-390/02-home-ar-dark-phone-390.webp](screens/12-variants-phone-390/02-home-ar-dark-phone-390.webp) |
| Home — EN light · phone 390 | `Home.html?loc=none&lang=en` | 390×844 | [12-variants-phone-390/03-home-en-light-phone-390.webp](screens/12-variants-phone-390/03-home-en-light-phone-390.webp) |
| Home — EN dark · phone 390 | `Home.html?loc=none&lang=en&theme=dark` | 390×844 | [12-variants-phone-390/04-home-en-dark-phone-390.webp](screens/12-variants-phone-390/04-home-en-dark-phone-390.webp) |
| Directory · list — AR light · phone 390 | `Directory.html?loc=none` | 390×844 | [01-flow/02-2-directory-list.webp](screens/01-flow/02-2-directory-list.webp) |
| Directory · list — AR dark · phone 390 | `Directory.html?loc=none&theme=dark` | 390×844 | [12-variants-phone-390/06-directory-list-ar-dark-phone-390.webp](screens/12-variants-phone-390/06-directory-list-ar-dark-phone-390.webp) |
| Directory · list — EN light · phone 390 | `Directory.html?loc=none&lang=en` | 390×844 | [12-variants-phone-390/07-directory-list-en-light-phone-390.webp](screens/12-variants-phone-390/07-directory-list-en-light-phone-390.webp) |
| Directory · list — EN dark · phone 390 | `Directory.html?loc=none&lang=en&theme=dark` | 390×844 | [12-variants-phone-390/08-directory-list-en-dark-phone-390.webp](screens/12-variants-phone-390/08-directory-list-en-dark-phone-390.webp) |
| Space details — AR light · phone 390 | `Space details.html?id=focus&loc=granted` | 390×844 | [04-space-details-variants/02-focus-hub-verified-fresh-5-photos-location-allowed-phone-390.webp](screens/04-space-details-variants/02-focus-hub-verified-fresh-5-photos-location-allowed-phone-390.webp) |
| Space details — AR dark · phone 390 | `Space details.html?id=focus&loc=granted&theme=dark` | 390×844 | [12-variants-phone-390/10-space-details-ar-dark-phone-390.webp](screens/12-variants-phone-390/10-space-details-ar-dark-phone-390.webp) |
| Space details — EN light · phone 390 | `Space details.html?id=focus&loc=granted&lang=en` | 390×844 | [12-variants-phone-390/11-space-details-en-light-phone-390.webp](screens/12-variants-phone-390/11-space-details-en-light-phone-390.webp) |
| Space details — EN dark · phone 390 | `Space details.html?id=focus&loc=granted&lang=en&theme=dark` | 390×844 | [12-variants-phone-390/12-space-details-en-dark-phone-390.webp](screens/12-variants-phone-390/12-space-details-en-dark-phone-390.webp) |
| Register — AR light · phone 390 | `Register.html?state=filled` | 390×844 | [12-variants-phone-390/13-register-ar-light-phone-390.webp](screens/12-variants-phone-390/13-register-ar-light-phone-390.webp) |
| Register — AR dark · phone 390 | `Register.html?state=filled&theme=dark` | 390×844 | [12-variants-phone-390/14-register-ar-dark-phone-390.webp](screens/12-variants-phone-390/14-register-ar-dark-phone-390.webp) |
| Register — EN light · phone 390 | `Register.html?state=filled&lang=en` | 390×844 | [12-variants-phone-390/15-register-en-light-phone-390.webp](screens/12-variants-phone-390/15-register-en-light-phone-390.webp) |
| Register — EN dark · phone 390 | `Register.html?state=filled&lang=en&theme=dark` | 390×844 | [12-variants-phone-390/16-register-en-dark-phone-390.webp](screens/12-variants-phone-390/16-register-en-dark-phone-390.webp) |

## 13 · Register — polish

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Filled · all rules ticked | `Register.html?state=filled` | 390×844 | [12-variants-phone-390/13-register-ar-light-phone-390.webp](screens/12-variants-phone-390/13-register-ar-light-phone-390.webp) |
| Submitted · unmet rules in error | `Register.html?state=errors` | 390×844 | [07-register/06-register-field-errors-phone-390.webp](screens/07-register/06-register-field-errors-phone-390.webp) |
| Forgot · «لا يمكنك الوصول إلى بريدك؟» | `Forgot password.html` | 390×844 | [08-forgot-reset-password/02-forgot-default-phone-390.webp](screens/08-forgot-reset-password/02-forgot-default-phone-390.webp) |

## 14 · Account — signed-in header

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Home · signed in — desktop 1440 | `Home.html?loc=none&auth=1` | 1440×1000 | [14-account-signed-in-header/01-home-signed-in-desktop-1440.webp](screens/14-account-signed-in-header/01-home-signed-in-desktop-1440.webp) |
| Home · signed in — phone 390 | `Home.html?loc=none&auth=1` | 390×844 | [14-account-signed-in-header/02-home-signed-in-phone-390.webp](screens/14-account-signed-in-header/02-home-signed-in-phone-390.webp) |
| Space details · signed in, saved — desktop 1440 | `Space details.html?id=focus&loc=none&auth=1&fav=1` | 1440×1000 | [14-account-signed-in-header/03-space-details-signed-in-saved-desktop-1440.webp](screens/14-account-signed-in-header/03-space-details-signed-in-saved-desktop-1440.webp) |
| Space details · signed in, saved — phone 390 | `Space details.html?id=focus&loc=none&auth=1&fav=1` | 390×844 | [14-account-signed-in-header/04-space-details-signed-in-saved-phone-390.webp](screens/14-account-signed-in-header/04-space-details-signed-in-saved-phone-390.webp) |

## 15 · Favourites «المفضّلة»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Favourites · saved spaces + one hidden — desktop 1440 | `Favorites.html?auth=1&loc=none` | 1440×1000 | [15-favourites/01-favourites-saved-spaces-one-hidden-desktop-1440.webp](screens/15-favourites/01-favourites-saved-spaces-one-hidden-desktop-1440.webp) |
| Favourites · saved spaces + one hidden — phone 390 | `Favorites.html?auth=1&loc=none` | 390×844 | [15-favourites/02-favourites-saved-spaces-one-hidden-phone-390.webp](screens/15-favourites/02-favourites-saved-spaces-one-hidden-phone-390.webp) |
| Favourites · location on — desktop 1440 | `Favorites.html?auth=1&loc=granted` | 1440×1000 | [15-favourites/03-favourites-location-on-desktop-1440.webp](screens/15-favourites/03-favourites-location-on-desktop-1440.webp) |
| Favourites · location on — phone 390 | `Favorites.html?auth=1&loc=granted` | 390×844 | [15-favourites/04-favourites-location-on-phone-390.webp](screens/15-favourites/04-favourites-location-on-phone-390.webp) |
| Favourites · empty — desktop 1440 | `Favorites.html?auth=1&state=empty` | 1440×1000 | [15-favourites/05-favourites-empty-desktop-1440.webp](screens/15-favourites/05-favourites-empty-desktop-1440.webp) |
| Favourites · empty — phone 390 | `Favorites.html?auth=1&state=empty` | 390×844 | [15-favourites/06-favourites-empty-phone-390.webp](screens/15-favourites/06-favourites-empty-phone-390.webp) |
| Favourites · loading — desktop 1440 | `Favorites.html?auth=1&state=loading` | 1440×1000 | [15-favourites/07-favourites-loading-desktop-1440.webp](screens/15-favourites/07-favourites-loading-desktop-1440.webp) |
| Favourites · loading — phone 390 | `Favorites.html?auth=1&state=loading` | 390×844 | [15-favourites/08-favourites-loading-phone-390.webp](screens/15-favourites/08-favourites-loading-phone-390.webp) |

## 16 · My reports «بلاغاتي»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Reports · list — desktop 1440 | `Reports.html?auth=1` | 1440×1000 | [16-my-reports/01-reports-list-desktop-1440.webp](screens/16-my-reports/01-reports-list-desktop-1440.webp) |
| Reports · list — phone 390 | `Reports.html?auth=1` | 390×844 | [16-my-reports/02-reports-list-phone-390.webp](screens/16-my-reports/02-reports-list-phone-390.webp) |
| Reports · empty — desktop 1440 | `Reports.html?auth=1&state=empty` | 1440×1000 | [16-my-reports/03-reports-empty-desktop-1440.webp](screens/16-my-reports/03-reports-empty-desktop-1440.webp) |
| Reports · empty — phone 390 | `Reports.html?auth=1&state=empty` | 390×844 | [16-my-reports/04-reports-empty-phone-390.webp](screens/16-my-reports/04-reports-empty-phone-390.webp) |
| Reports · loading — desktop 1440 | `Reports.html?auth=1&state=loading` | 1440×1000 | [16-my-reports/05-reports-loading-desktop-1440.webp](screens/16-my-reports/05-reports-loading-desktop-1440.webp) |
| Reports · loading — phone 390 | `Reports.html?auth=1&state=loading` | 390×844 | [16-my-reports/06-reports-loading-phone-390.webp](screens/16-my-reports/06-reports-loading-phone-390.webp) |
| Reports · error — desktop 1440 | `Reports.html?auth=1&state=error` | 1440×1000 | [16-my-reports/07-reports-error-desktop-1440.webp](screens/16-my-reports/07-reports-error-desktop-1440.webp) |
| Reports · error — phone 390 | `Reports.html?auth=1&state=error` | 390×844 | [16-my-reports/08-reports-error-phone-390.webp](screens/16-my-reports/08-reports-error-phone-390.webp) |

## 17 · Settings «الإعدادات»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Settings · email account — desktop 1440 | `Settings.html?auth=1` | 1440×1000 | [17-settings/01-settings-email-account-desktop-1440.webp](screens/17-settings/01-settings-email-account-desktop-1440.webp) |
| Settings · email account — phone 390 | `Settings.html?auth=1` | 390×844 | [17-settings/02-settings-email-account-phone-390.webp](screens/17-settings/02-settings-email-account-phone-390.webp) |
| Settings · Google-only account — desktop 1440 | `Settings.html?auth=google` | 1440×1000 | [17-settings/03-settings-google-only-account-desktop-1440.webp](screens/17-settings/03-settings-google-only-account-desktop-1440.webp) |
| Settings · Google-only account — phone 390 | `Settings.html?auth=google` | 390×844 | [17-settings/04-settings-google-only-account-phone-390.webp](screens/17-settings/04-settings-google-only-account-phone-390.webp) |
| Settings · linked account — desktop 1440 | `Settings.html?auth=linked` | 1440×1000 | [17-settings/05-settings-linked-account-desktop-1440.webp](screens/17-settings/05-settings-linked-account-desktop-1440.webp) |
| Settings · linked account — phone 390 | `Settings.html?auth=linked` | 390×844 | [17-settings/06-settings-linked-account-phone-390.webp](screens/17-settings/06-settings-linked-account-phone-390.webp) |
| Settings · wrong current password — desktop 1440 | `Settings.html?auth=1&state=wrongpw` | 1440×1000 | [17-settings/07-settings-wrong-current-password-desktop-1440.webp](screens/17-settings/07-settings-wrong-current-password-desktop-1440.webp) |
| Settings · wrong current password — phone 390 | `Settings.html?auth=1&state=wrongpw` | 390×844 | [17-settings/08-settings-wrong-current-password-phone-390.webp](screens/17-settings/08-settings-wrong-current-password-phone-390.webp) |
| Settings · too many attempts — desktop 1440 | `Settings.html?auth=1&state=ratelimit` | 1440×1000 | [17-settings/09-settings-too-many-attempts-desktop-1440.webp](screens/17-settings/09-settings-too-many-attempts-desktop-1440.webp) |
| Settings · too many attempts — phone 390 | `Settings.html?auth=1&state=ratelimit` | 390×844 | [17-settings/10-settings-too-many-attempts-phone-390.webp](screens/17-settings/10-settings-too-many-attempts-phone-390.webp) |
| Settings · sign out of all devices (confirm) — desktop 1440 | `Settings.html?auth=1&state=signout` | 1440×1000 | [17-settings/11-settings-sign-out-of-all-devices-confirm-desktop-1440.webp](screens/17-settings/11-settings-sign-out-of-all-devices-confirm-desktop-1440.webp) |
| Settings · sign out of all devices (confirm) — phone 390 | `Settings.html?auth=1&state=signout` | 390×844 | [17-settings/12-settings-sign-out-of-all-devices-confirm-phone-390.webp](screens/17-settings/12-settings-sign-out-of-all-devices-confirm-phone-390.webp) |

## 18 · Forced password change

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Forced change · empty — desktop 1440 | `Change password.html?auth=1` | 1440×1000 | [18-forced-password-change/01-forced-change-empty-desktop-1440.webp](screens/18-forced-password-change/01-forced-change-empty-desktop-1440.webp) |
| Forced change · empty — phone 390 | `Change password.html?auth=1` | 390×844 | [18-forced-password-change/02-forced-change-empty-phone-390.webp](screens/18-forced-password-change/02-forced-change-empty-phone-390.webp) |
| Forced change · typing — desktop 1440 | `Change password.html?auth=1&state=typing` | 1440×1000 | [18-forced-password-change/03-forced-change-typing-desktop-1440.webp](screens/18-forced-password-change/03-forced-change-typing-desktop-1440.webp) |
| Forced change · typing — phone 390 | `Change password.html?auth=1&state=typing` | 390×844 | [18-forced-password-change/04-forced-change-typing-phone-390.webp](screens/18-forced-password-change/04-forced-change-typing-phone-390.webp) |

## 19 · Account — batch-2 fixes

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Favourites · vertical nav — desktop 1440 | `Favorites.html?auth=1&loc=none` | 1440×1000 | [15-favourites/01-favourites-saved-spaces-one-hidden-desktop-1440.webp](screens/15-favourites/01-favourites-saved-spaces-one-hidden-desktop-1440.webp) |
| Favourites · vertical nav — phone 390 | `Favorites.html?auth=1&loc=none` | 390×844 | [15-favourites/02-favourites-saved-spaces-one-hidden-phone-390.webp](screens/15-favourites/02-favourites-saved-spaces-one-hidden-phone-390.webp) |
| My reports · replies — desktop 1440 | `Reports.html?auth=1` | 1440×1000 | [16-my-reports/01-reports-list-desktop-1440.webp](screens/16-my-reports/01-reports-list-desktop-1440.webp) |
| My reports · replies — phone 390 | `Reports.html?auth=1` | 390×844 | [16-my-reports/02-reports-list-phone-390.webp](screens/16-my-reports/02-reports-list-phone-390.webp) |

## 20 · Flow — front desk

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| 1 · Search «رهف» → card | `Desk.html?q=رهف` | 1440×1000 | [20-flow-front-desk/01-1-search-card.webp](screens/20-flow-front-desk/01-1-search-card.webp) |
| 2 · Check-in (warning, never blocks) | `Desk.html?q=ميار&dialog=warn&cid=m12` | 1440×1000 | [20-flow-front-desk/02-2-check-in-warning-never-blocks.webp](screens/20-flow-front-desk/02-2-check-in-warning-never-blocks.webp) |
| 3 · Check-out a visit | `Desk.html?dialog=checkout&pid=pv0` | 1440×1000 | [20-flow-front-desk/03-3-check-out-a-visit.webp](screens/20-flow-front-desk/03-3-check-out-a-visit.webp) |
| 4 · Paid → toast, list updated | `Desk.html?dialog=pay&cid=m10&item=u1` | 1440×1000 | [20-flow-front-desk/04-4-paid-toast-list-updated.webp](screens/20-flow-front-desk/04-4-paid-toast-list-updated.webp) |

## 21 · Front desk «مكتب الاستقبال» — RECEPTION vs OWNER

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Desk · reception (سامي) — desktop 1440 | `Desk.html?role=reception` | 1440×1000 | [21-front-desk-reception-vs-owner/01-desk-reception-desktop-1440.webp](screens/21-front-desk-reception-vs-owner/01-desk-reception-desktop-1440.webp) |
| Desk · reception (سامي) — phone 390 | `Desk.html?role=reception` | 390×844 | [21-front-desk-reception-vs-owner/02-desk-reception-phone-390.webp](screens/21-front-desk-reception-vs-owner/02-desk-reception-phone-390.webp) |
| Desk · owner (أحمد) — desktop 1440 | `Desk.html` | 1440×1000 | [21-front-desk-reception-vs-owner/03-desk-owner-desktop-1440.webp](screens/21-front-desk-reception-vs-owner/03-desk-owner-desktop-1440.webp) |
| Desk · owner (أحمد) — phone 390 | `Desk.html` | 390×844 | [21-front-desk-reception-vs-owner/04-desk-owner-phone-390.webp](screens/21-front-desk-reception-vs-owner/04-desk-owner-phone-390.webp) |
| Desk · search results — desktop 1440 | `Desk.html?role=reception&q=نور` | 1440×1000 | [21-front-desk-reception-vs-owner/05-desk-search-results-desktop-1440.webp](screens/21-front-desk-reception-vs-owner/05-desk-search-results-desktop-1440.webp) |
| Desk · search results — phone 390 | `Desk.html?role=reception&q=نور` | 390×844 | [21-front-desk-reception-vs-owner/06-desk-search-results-phone-390.webp](screens/21-front-desk-reception-vs-owner/06-desk-search-results-phone-390.webp) |
| Desk · no result → «زبون جديد باسم …» — desktop 1440 | `Desk.html?role=reception&q=سليم` | 1440×1000 | [21-front-desk-reception-vs-owner/07-desk-no-result-desktop-1440.webp](screens/21-front-desk-reception-vs-owner/07-desk-no-result-desktop-1440.webp) |
| Desk · no result → «زبون جديد باسم …» — phone 390 | `Desk.html?role=reception&q=سليم` | 390×844 | [21-front-desk-reception-vs-owner/08-desk-no-result-phone-390.webp](screens/21-front-desk-reception-vs-owner/08-desk-no-result-phone-390.webp) |
| Desk · empty — desktop 1440 | `Desk.html?role=reception&state=empty` | 1440×1000 | [21-front-desk-reception-vs-owner/09-desk-empty-desktop-1440.webp](screens/21-front-desk-reception-vs-owner/09-desk-empty-desktop-1440.webp) |
| Desk · empty — phone 390 | `Desk.html?role=reception&state=empty` | 390×844 | [21-front-desk-reception-vs-owner/10-desk-empty-phone-390.webp](screens/21-front-desk-reception-vs-owner/10-desk-empty-phone-390.webp) |
| Desk · loading — desktop 1440 | `Desk.html?role=reception&state=loading` | 1440×1000 | [21-front-desk-reception-vs-owner/11-desk-loading-desktop-1440.webp](screens/21-front-desk-reception-vs-owner/11-desk-loading-desktop-1440.webp) |
| Desk · loading — phone 390 | `Desk.html?role=reception&state=loading` | 390×844 | [21-front-desk-reception-vs-owner/12-desk-loading-phone-390.webp](screens/21-front-desk-reception-vs-owner/12-desk-loading-phone-390.webp) |
| Desk · status set to Full (countdown) — desktop 1440 | `Desk.html?role=reception&override=30` | 1440×1000 | [21-front-desk-reception-vs-owner/13-desk-status-set-to-full-countdown-desktop-1440.webp](screens/21-front-desk-reception-vs-owner/13-desk-status-set-to-full-countdown-desktop-1440.webp) |
| Desk · status set to Full (countdown) — phone 390 | `Desk.html?role=reception&override=30` | 390×844 | [21-front-desk-reception-vs-owner/14-desk-status-set-to-full-countdown-phone-390.webp](screens/21-front-desk-reception-vs-owner/14-desk-status-set-to-full-countdown-phone-390.webp) |
| Desk · log tab — desktop 1440 | `Desk.html?role=reception&tab=log` | 1440×1000 | [21-front-desk-reception-vs-owner/15-desk-log-tab-desktop-1440.webp](screens/21-front-desk-reception-vs-owner/15-desk-log-tab-desktop-1440.webp) |
| Desk · log tab — phone 390 | `Desk.html?role=reception&tab=log` | 390×844 | [21-front-desk-reception-vs-owner/16-desk-log-tab-phone-390.webp](screens/21-front-desk-reception-vs-owner/16-desk-log-tab-phone-390.webp) |

## 22 · Check-in «تسجيل زيارة» + warnings

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Visit dialog — desktop 1440 | `Desk.html?role=reception&dialog=visit` | 1440×1000 | [22-check-in-warnings/01-visit-dialog-desktop-1440.webp](screens/22-check-in-warnings/01-visit-dialog-desktop-1440.webp) |
| Visit dialog — phone 390 | `Desk.html?role=reception&dialog=visit` | 390×844 | [22-check-in-warnings/02-visit-dialog-phone-390.webp](screens/22-check-in-warnings/02-visit-dialog-phone-390.webp) |
| Expired → «تسجيل كزيارة» / «تجديد» — desktop 1440 | `Desk.html?role=reception&dialog=warn&cid=m5` | 1440×1000 | [22-check-in-warnings/03-expired-desktop-1440.webp](screens/22-check-in-warnings/03-expired-desktop-1440.webp) |
| Expired → «تسجيل كزيارة» / «تجديد» — phone 390 | `Desk.html?role=reception&dialog=warn&cid=m5` | 390×844 | [22-check-in-warnings/04-expired-phone-390.webp](screens/22-check-in-warnings/04-expired-phone-390.webp) |
| Not one of his days — desktop 1440 | `Desk.html?role=reception&dialog=warn&cid=m12` | 1440×1000 | [22-check-in-warnings/05-not-one-of-his-days-desktop-1440.webp](screens/22-check-in-warnings/05-not-one-of-his-days-desktop-1440.webp) |
| Not one of his days — phone 390 | `Desk.html?role=reception&dialog=warn&cid=m12` | 390×844 | [22-check-in-warnings/06-not-one-of-his-days-phone-390.webp](screens/22-check-in-warnings/06-not-one-of-his-days-phone-390.webp) |
| Over today’s hours — desktop 1440 | `Desk.html?role=reception&dialog=warn&cid=m13` | 1440×1000 | [22-check-in-warnings/07-over-today-s-hours-desktop-1440.webp](screens/22-check-in-warnings/07-over-today-s-hours-desktop-1440.webp) |
| Over today’s hours — phone 390 | `Desk.html?role=reception&dialog=warn&cid=m13` | 390×844 | [22-check-in-warnings/08-over-today-s-hours-phone-390.webp](screens/22-check-in-warnings/08-over-today-s-hours-phone-390.webp) |
| Already present — desktop 1440 | `Desk.html?role=reception&dialog=warn&cid=m1` | 1440×1000 | [22-check-in-warnings/09-already-present-desktop-1440.webp](screens/22-check-in-warnings/09-already-present-desktop-1440.webp) |
| Already present — phone 390 | `Desk.html?role=reception&dialog=warn&cid=m1` | 390×844 | [22-check-in-warnings/10-already-present-phone-390.webp](screens/22-check-in-warnings/10-already-present-phone-390.webp) |
| Space full 40/40 — desktop 1440 | `Desk.html?role=reception&dialog=warn&cid=m8&full=1` | 1440×1000 | [22-check-in-warnings/11-space-full-40-40-desktop-1440.webp](screens/22-check-in-warnings/11-space-full-40-40-desktop-1440.webp) |
| Space full 40/40 — phone 390 | `Desk.html?role=reception&dialog=warn&cid=m8&full=1` | 390×844 | [22-check-in-warnings/12-space-full-40-40-phone-390.webp](screens/22-check-in-warnings/12-space-full-40-40-phone-390.webp) |

## 23 · Check-out «خروج»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Visit · 4 h × 3 ₪ = 12 ₪ — desktop 1440 | `Desk.html?role=reception&dialog=checkout&pid=pv0` | 1440×1000 | [23-check-out/01-visit-4-h-3-12-desktop-1440.webp](screens/23-check-out/01-visit-4-h-3-12-desktop-1440.webp) |
| Visit · 4 h × 3 ₪ = 12 ₪ — phone 390 | `Desk.html?role=reception&dialog=checkout&pid=pv0` | 390×844 | [23-check-out/02-visit-4-h-3-12-phone-390.webp](screens/23-check-out/02-visit-4-h-3-12-phone-390.webp) |
| Visit · without paying (phone required) — desktop 1440 | `Desk.html?role=reception&dialog=checkout&pid=pv0&debt=1` | 1440×1000 | [23-check-out/03-visit-without-paying-phone-required-desktop-1440.webp](screens/23-check-out/03-visit-without-paying-phone-required-desktop-1440.webp) |
| Visit · without paying (phone required) — phone 390 | `Desk.html?role=reception&dialog=checkout&pid=pv0&debt=1` | 390×844 | [23-check-out/04-visit-without-paying-phone-required-phone-390.webp](screens/23-check-out/04-visit-without-paying-phone-required-phone-390.webp) |
| Subscriber · usage-based — desktop 1440 | `Desk.html?role=reception&dialog=checkout&pid=ps2` | 1440×1000 | [23-check-out/05-subscriber-usage-based-desktop-1440.webp](screens/23-check-out/05-subscriber-usage-based-desktop-1440.webp) |
| Subscriber · usage-based — phone 390 | `Desk.html?role=reception&dialog=checkout&pid=ps2` | 390×844 | [23-check-out/06-subscriber-usage-based-phone-390.webp](screens/23-check-out/06-subscriber-usage-based-phone-390.webp) |
| Subscriber · monthly — desktop 1440 | `Desk.html?role=reception&dialog=checkout&pid=ps0` | 1440×1000 | [23-check-out/07-subscriber-monthly-desktop-1440.webp](screens/23-check-out/07-subscriber-monthly-desktop-1440.webp) |
| Subscriber · monthly — phone 390 | `Desk.html?role=reception&dialog=checkout&pid=ps0` | 390×844 | [23-check-out/08-subscriber-monthly-phone-390.webp](screens/23-check-out/08-subscriber-monthly-phone-390.webp) |

## 24 · New customer / subscription sheet

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Step 1 · customer — desktop 1440 | `Desk.html?role=reception&dialog=sheet&mode=new&name=سليم` | 1440×1000 | [24-new-customer-subscription-sheet/01-step-1-customer-desktop-1440.webp](screens/24-new-customer-subscription-sheet/01-step-1-customer-desktop-1440.webp) |
| Step 1 · customer — phone 390 | `Desk.html?role=reception&dialog=sheet&mode=new&name=سليم` | 390×844 | [24-new-customer-subscription-sheet/02-step-1-customer-phone-390.webp](screens/24-new-customer-subscription-sheet/02-step-1-customer-phone-390.webp) |
| Step 2 · package + partial payment — desktop 1440 | `Desk.html?role=reception&dialog=sheet&mode=renew&cid=m7&paynow=50` | 1440×1000 | [24-new-customer-subscription-sheet/03-step-2-package-partial-payment-desktop-1440.webp](screens/24-new-customer-subscription-sheet/03-step-2-package-partial-payment-desktop-1440.webp) |
| Step 2 · package + partial payment — phone 390 | `Desk.html?role=reception&dialog=sheet&mode=renew&cid=m7&paynow=50` | 390×844 | [24-new-customer-subscription-sheet/04-step-2-package-partial-payment-phone-390.webp](screens/24-new-customer-subscription-sheet/04-step-2-package-partial-payment-phone-390.webp) |
| Step 2 · «مخصّص» — desktop 1440 | `Desk.html?role=reception&dialog=sheet&mode=subscribe&cid=m3&pkg=custom` | 1440×1000 | [24-new-customer-subscription-sheet/05-step-2-desktop-1440.webp](screens/24-new-customer-subscription-sheet/05-step-2-desktop-1440.webp) |
| Step 2 · «مخصّص» — phone 390 | `Desk.html?role=reception&dialog=sheet&mode=subscribe&cid=m3&pkg=custom` | 390×844 | [24-new-customer-subscription-sheet/06-step-2-phone-390.webp](screens/24-new-customer-subscription-sheet/06-step-2-phone-390.webp) |
| Renewal with an unpaid September — desktop 1440 | `Customers.html?role=reception&renew=m6` | 1440×1000 | [24-new-customer-subscription-sheet/07-renewal-with-an-unpaid-september-desktop-1440.webp](screens/24-new-customer-subscription-sheet/07-renewal-with-an-unpaid-september-desktop-1440.webp) |
| Renewal with an unpaid September — phone 390 | `Customers.html?role=reception&renew=m6` | 390×844 | [24-new-customer-subscription-sheet/08-renewal-with-an-unpaid-september-phone-390.webp](screens/24-new-customer-subscription-sheet/08-renewal-with-an-unpaid-september-phone-390.webp) |

## 25 · Receive payment «استلام دفعة»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Pick customer — desktop 1440 | `Desk.html?role=reception&dialog=pay` | 1440×1000 | [25-receive-payment/01-pick-customer-desktop-1440.webp](screens/25-receive-payment/01-pick-customer-desktop-1440.webp) |
| Pick customer — phone 390 | `Desk.html?role=reception&dialog=pay` | 390×844 | [25-receive-payment/02-pick-customer-phone-390.webp](screens/25-receive-payment/02-pick-customer-phone-390.webp) |
| Open items — desktop 1440 | `Desk.html?role=reception&dialog=pay&cid=m6` | 1440×1000 | [25-receive-payment/03-open-items-desktop-1440.webp](screens/25-receive-payment/03-open-items-desktop-1440.webp) |
| Open items — phone 390 | `Desk.html?role=reception&dialog=pay&cid=m6` | 390×844 | [25-receive-payment/04-open-items-phone-390.webp](screens/25-receive-payment/04-open-items-phone-390.webp) |

## 26 · Customers «الزبائن» — RECEPTION vs OWNER

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Customers · reception — desktop 1440 | `Customers.html?role=reception` | 1440×1000 | [26-customers-reception-vs-owner/01-customers-reception-desktop-1440.webp](screens/26-customers-reception-vs-owner/01-customers-reception-desktop-1440.webp) |
| Customers · reception — phone 390 | `Customers.html?role=reception` | 390×844 | [26-customers-reception-vs-owner/02-customers-reception-phone-390.webp](screens/26-customers-reception-vs-owner/02-customers-reception-phone-390.webp) |
| Customers · owner — desktop 1440 | `Customers.html` | 1440×1000 | [26-customers-reception-vs-owner/03-customers-owner-desktop-1440.webp](screens/26-customers-reception-vs-owner/03-customers-owner-desktop-1440.webp) |
| Customers · owner — phone 390 | `Customers.html` | 390×844 | [26-customers-reception-vs-owner/04-customers-owner-phone-390.webp](screens/26-customers-reception-vs-owner/04-customers-owner-phone-390.webp) |
| Filter · owes money — desktop 1440 | `Customers.html?pay=owes` | 1440×1000 | [26-customers-reception-vs-owner/05-filter-owes-money-desktop-1440.webp](screens/26-customers-reception-vs-owner/05-filter-owes-money-desktop-1440.webp) |
| Filter · owes money — phone 390 | `Customers.html?pay=owes` | 390×844 | [26-customers-reception-vs-owner/06-filter-owes-money-phone-390.webp](screens/26-customers-reception-vs-owner/06-filter-owes-money-phone-390.webp) |
| Archive with debt (owner) — desktop 1440 | `Customers.html?archive=m6` | 1440×1000 | [26-customers-reception-vs-owner/07-archive-with-debt-owner-desktop-1440.webp](screens/26-customers-reception-vs-owner/07-archive-with-debt-owner-desktop-1440.webp) |
| Archive with debt (owner) — phone 390 | `Customers.html?archive=m6` | 390×844 | [26-customers-reception-vs-owner/08-archive-with-debt-owner-phone-390.webp](screens/26-customers-reception-vs-owner/08-archive-with-debt-owner-phone-390.webp) |
| Customers · empty — desktop 1440 | `Customers.html?state=empty` | 1440×1000 | [26-customers-reception-vs-owner/09-customers-empty-desktop-1440.webp](screens/26-customers-reception-vs-owner/09-customers-empty-desktop-1440.webp) |
| Customers · empty — phone 390 | `Customers.html?state=empty` | 390×844 | [26-customers-reception-vs-owner/10-customers-empty-phone-390.webp](screens/26-customers-reception-vs-owner/10-customers-empty-phone-390.webp) |
| Customers · loading — desktop 1440 | `Customers.html?state=loading` | 1440×1000 | [26-customers-reception-vs-owner/11-customers-loading-desktop-1440.webp](screens/26-customers-reception-vs-owner/11-customers-loading-desktop-1440.webp) |
| Customers · loading — phone 390 | `Customers.html?state=loading` | 390×844 | [26-customers-reception-vs-owner/12-customers-loading-phone-390.webp](screens/26-customers-reception-vs-owner/12-customers-loading-phone-390.webp) |

## 27 · Customer file «ملف الزبون»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Memberships · partly paid — desktop 1440 | `Customer file.html?id=m6` | 1440×1000 | [27-customer-file/01-memberships-partly-paid-desktop-1440.webp](screens/27-customer-file/01-memberships-partly-paid-desktop-1440.webp) |
| Memberships · partly paid — phone 390 | `Customer file.html?id=m6` | 390×844 | [27-customer-file/02-memberships-partly-paid-phone-390.webp](screens/27-customer-file/02-memberships-partly-paid-phone-390.webp) |
| Attendance statement · usage-based — desktop 1440 | `Customer file.html?id=m4&tab=att` | 1440×1000 | [27-customer-file/03-attendance-statement-usage-based-desktop-1440.webp](screens/27-customer-file/03-attendance-statement-usage-based-desktop-1440.webp) |
| Attendance statement · usage-based — phone 390 | `Customer file.html?id=m4&tab=att` | 390×844 | [27-customer-file/04-attendance-statement-usage-based-phone-390.webp](screens/27-customer-file/04-attendance-statement-usage-based-phone-390.webp) |
| Payments · voided shown struck (owner) — desktop 1440 | `Customer file.html?id=m6&tab=pays` | 1440×1000 | [27-customer-file/05-payments-voided-shown-struck-owner-desktop-1440.webp](screens/27-customer-file/05-payments-voided-shown-struck-owner-desktop-1440.webp) |
| Payments · voided shown struck (owner) — phone 390 | `Customer file.html?id=m6&tab=pays` | 390×844 | [27-customer-file/06-payments-voided-shown-struck-owner-phone-390.webp](screens/27-customer-file/06-payments-voided-shown-struck-owner-phone-390.webp) |
| Payments · reception (no void) — desktop 1440 | `Customer file.html?id=m6&tab=pays&role=reception` | 1440×1000 | [27-customer-file/07-payments-reception-no-void-desktop-1440.webp](screens/27-customer-file/07-payments-reception-no-void-desktop-1440.webp) |
| Payments · reception (no void) — phone 390 | `Customer file.html?id=m6&tab=pays&role=reception` | 390×844 | [27-customer-file/08-payments-reception-no-void-phone-390.webp](screens/27-customer-file/08-payments-reception-no-void-phone-390.webp) |
| Void a payment · reason required — desktop 1440 | `Customer file.html?id=m1&tab=pays&void=1` | 1440×1000 | [27-customer-file/09-void-a-payment-reason-required-desktop-1440.webp](screens/27-customer-file/09-void-a-payment-reason-required-desktop-1440.webp) |
| Void a payment · reason required — phone 390 | `Customer file.html?id=m1&tab=pays&void=1` | 390×844 | [27-customer-file/10-void-a-payment-reason-required-phone-390.webp](screens/27-customer-file/10-void-a-payment-reason-required-phone-390.webp) |

## 28 · Reception only «دفعاتي اليوم»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| My payments today — desktop 1440 | `My payments.html?role=reception` | 1440×1000 | [28-reception-only/01-my-payments-today-desktop-1440.webp](screens/28-reception-only/01-my-payments-today-desktop-1440.webp) |
| My payments today — phone 390 | `My payments.html?role=reception` | 390×844 | [28-reception-only/02-my-payments-today-phone-390.webp](screens/28-reception-only/02-my-payments-today-phone-390.webp) |
| My payments · empty — desktop 1440 | `My payments.html?role=reception&state=empty` | 1440×1000 | [28-reception-only/03-my-payments-empty-desktop-1440.webp](screens/28-reception-only/03-my-payments-empty-desktop-1440.webp) |
| My payments · empty — phone 390 | `My payments.html?role=reception&state=empty` | 390×844 | [28-reception-only/04-my-payments-empty-phone-390.webp](screens/28-reception-only/04-my-payments-empty-phone-390.webp) |

## 29 · Owner — overview «نظرة عامة» (kept)

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Overview — desktop 1440 | `Owner overview.html` | 1440×1000 | [29-owner-overview-kept/01-overview-desktop-1440.webp](screens/29-owner-overview-kept/01-overview-desktop-1440.webp) |
| Overview — phone 390 | `Owner overview.html` | 390×844 | [29-owner-overview-kept/02-overview-phone-390.webp](screens/29-owner-overview-kept/02-overview-phone-390.webp) |
| Overview · status set to Full — desktop 1440 | `Owner overview.html?override=120` | 1440×1000 | [29-owner-overview-kept/03-overview-status-set-to-full-desktop-1440.webp](screens/29-owner-overview-kept/03-overview-status-set-to-full-desktop-1440.webp) |
| Overview · status set to Full — phone 390 | `Owner overview.html?override=120` | 390×844 | [29-owner-overview-kept/04-overview-status-set-to-full-phone-390.webp](screens/29-owner-overview-kept/04-overview-status-set-to-full-phone-390.webp) |

## 30 · Owner — space profile «ملف المساحة» (kept)

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Space profile — desktop 1440 | `Owner space profile.html` | 1440×1000 | [30-owner-space-profile-kept/01-space-profile-desktop-1440.webp](screens/30-owner-space-profile-kept/01-space-profile-desktop-1440.webp) |
| Space profile — phone 390 | `Owner space profile.html` | 390×844 | [30-owner-space-profile-kept/02-space-profile-phone-390.webp](screens/30-owner-space-profile-kept/02-space-profile-phone-390.webp) |

## 31 · Batch 3a fixes

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Overview · money row + «34 اليوم · 27 الآن» — desktop 1440 | `Owner overview.html` | 1440×1000 | [29-owner-overview-kept/01-overview-desktop-1440.webp](screens/29-owner-overview-kept/01-overview-desktop-1440.webp) |
| Overview · money row + «34 اليوم · 27 الآن» — phone 390 | `Owner overview.html` | 390×844 | [29-owner-overview-kept/02-overview-phone-390.webp](screens/29-owner-overview-kept/02-overview-phone-390.webp) |
| «ضبط الحالة» open — desktop 1440 | `Desk.html?status=open` | 1440×1000 | [31-batch-3a-fixes/03-open-desktop-1440.webp](screens/31-batch-3a-fixes/03-open-desktop-1440.webp) |
| «ضبط الحالة» open — phone 390 | `Desk.html?status=open` | 390×844 | [31-batch-3a-fixes/04-open-phone-390.webp](screens/31-batch-3a-fixes/04-open-phone-390.webp) |
| Override active · «ممتلئ يدويًا · 1:24 متبقية» — desktop 1440 | `Desk.html?override=full:84` | 1440×1000 | [31-batch-3a-fixes/05-override-active-1-24-desktop-1440.webp](screens/31-batch-3a-fixes/05-override-active-1-24-desktop-1440.webp) |
| Override active · «ممتلئ يدويًا · 1:24 متبقية» — phone 390 | `Desk.html?override=full:84` | 390×844 | [31-batch-3a-fixes/06-override-active-1-24-phone-390.webp](screens/31-batch-3a-fixes/06-override-active-1-24-phone-390.webp) |
| Override · «مغلق الآن» manually — desktop 1440 | `Desk.html?role=reception&override=closed:30` | 1440×1000 | [31-batch-3a-fixes/07-override-manually-desktop-1440.webp](screens/31-batch-3a-fixes/07-override-manually-desktop-1440.webp) |
| Override · «مغلق الآن» manually — phone 390 | `Desk.html?role=reception&override=closed:30` | 390×844 | [31-batch-3a-fixes/08-override-manually-phone-390.webp](screens/31-batch-3a-fixes/08-override-manually-phone-390.webp) |
| Outside opening hours · control disabled — desktop 1440 | `Desk.html?hours=closed` | 1440×1000 | [31-batch-3a-fixes/09-outside-opening-hours-control-disabled-desktop-1440.webp](screens/31-batch-3a-fixes/09-outside-opening-hours-control-disabled-desktop-1440.webp) |
| Outside opening hours · control disabled — phone 390 | `Desk.html?hours=closed` | 390×844 | [31-batch-3a-fixes/10-outside-opening-hours-control-disabled-phone-390.webp](screens/31-batch-3a-fixes/10-outside-opening-hours-control-disabled-phone-390.webp) |
| End membership (confirm) — desktop 1440 | `Customer file.html?id=m1&end=1` | 1440×1000 | [31-batch-3a-fixes/11-end-membership-confirm-desktop-1440.webp](screens/31-batch-3a-fixes/11-end-membership-confirm-desktop-1440.webp) |
| End membership (confirm) — phone 390 | `Customer file.html?id=m1&end=1` | 390×844 | [31-batch-3a-fixes/12-end-membership-confirm-phone-390.webp](screens/31-batch-3a-fixes/12-end-membership-confirm-phone-390.webp) |
| Credit · «له رصيد 18 ₪» — desktop 1440 | `Customer file.html?id=m15` | 1440×1000 | [31-batch-3a-fixes/13-credit-18-desktop-1440.webp](screens/31-batch-3a-fixes/13-credit-18-desktop-1440.webp) |
| Credit · «له رصيد 18 ₪» — phone 390 | `Customer file.html?id=m15` | 390×844 | [31-batch-3a-fixes/14-credit-18-phone-390.webp](screens/31-batch-3a-fixes/14-credit-18-phone-390.webp) |
| Customers · «له رصيد» filter — desktop 1440 | `Customers.html?pay=credit` | 1440×1000 | [31-batch-3a-fixes/15-customers-filter-desktop-1440.webp](screens/31-batch-3a-fixes/15-customers-filter-desktop-1440.webp) |
| Customers · «له رصيد» filter — phone 390 | `Customers.html?pay=credit` | 390×844 | [31-batch-3a-fixes/16-customers-filter-phone-390.webp](screens/31-batch-3a-fixes/16-customers-filter-phone-390.webp) |
| Visit check-out · no hour price → day price — desktop 1440 | `Desk.html?role=reception&dialog=checkout&pid=pv0&prices=dayonly` | 1440×1000 | [31-batch-3a-fixes/17-visit-check-out-no-hour-price-day-price-desktop-1440.webp](screens/31-batch-3a-fixes/17-visit-check-out-no-hour-price-day-price-desktop-1440.webp) |
| Visit check-out · no hour price → day price — phone 390 | `Desk.html?role=reception&dialog=checkout&pid=pv0&prices=dayonly` | 390×844 | [31-batch-3a-fixes/18-visit-check-out-no-hour-price-day-price-phone-390.webp](screens/31-batch-3a-fixes/18-visit-check-out-no-hour-price-day-price-phone-390.webp) |
| Visit check-out · no prices → «سعر يدوي» — desktop 1440 | `Desk.html?role=reception&dialog=checkout&pid=pv0&prices=none` | 1440×1000 | [31-batch-3a-fixes/19-visit-check-out-no-prices-desktop-1440.webp](screens/31-batch-3a-fixes/19-visit-check-out-no-prices-desktop-1440.webp) |
| Visit check-out · no prices → «سعر يدوي» — phone 390 | `Desk.html?role=reception&dialog=checkout&pid=pv0&prices=none` | 390×844 | [31-batch-3a-fixes/20-visit-check-out-no-prices-phone-390.webp](screens/31-batch-3a-fixes/20-visit-check-out-no-prices-phone-390.webp) |

## 32 · Payments «الدفعات» (owner)

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Ledger · this month — desktop 1440 | `Payments.html` | 1440×1000 | [32-payments-owner/01-ledger-this-month-desktop-1440.webp](screens/32-payments-owner/01-ledger-this-month-desktop-1440.webp) |
| Ledger · this month — phone 390 | `Payments.html` | 390×844 | [32-payments-owner/02-ledger-this-month-phone-390.webp](screens/32-payments-owner/02-ledger-this-month-phone-390.webp) |
| Ledger · today — desktop 1440 | `Payments.html?range=today` | 1440×1000 | [32-payments-owner/03-ledger-today-desktop-1440.webp](screens/32-payments-owner/03-ledger-today-desktop-1440.webp) |
| Ledger · today — phone 390 | `Payments.html?range=today` | 390×844 | [32-payments-owner/04-ledger-today-phone-390.webp](screens/32-payments-owner/04-ledger-today-phone-390.webp) |
| Voided shown (struck + who) — desktop 1440 | `Payments.html?voided=1` | 1440×1000 | [32-payments-owner/05-voided-shown-struck-who-desktop-1440.webp](screens/32-payments-owner/05-voided-shown-struck-who-desktop-1440.webp) |
| Voided shown (struck + who) — phone 390 | `Payments.html?voided=1` | 390×844 | [32-payments-owner/06-voided-shown-struck-who-phone-390.webp](screens/32-payments-owner/06-voided-shown-struck-who-phone-390.webp) |
| Void a payment · reason required — desktop 1440 | `Payments.html?void=1` | 1440×1000 | [32-payments-owner/07-void-a-payment-reason-required-desktop-1440.webp](screens/32-payments-owner/07-void-a-payment-reason-required-desktop-1440.webp) |
| Void a payment · reason required — phone 390 | `Payments.html?void=1` | 390×844 | [32-payments-owner/08-void-a-payment-reason-required-phone-390.webp](screens/32-payments-owner/08-void-a-payment-reason-required-phone-390.webp) |
| Empty — desktop 1440 | `Payments.html?state=empty` | 1440×1000 | [32-payments-owner/09-empty-desktop-1440.webp](screens/32-payments-owner/09-empty-desktop-1440.webp) |
| Empty — phone 390 | `Payments.html?state=empty` | 390×844 | [32-payments-owner/10-empty-phone-390.webp](screens/32-payments-owner/10-empty-phone-390.webp) |
| Loading — desktop 1440 | `Payments.html?state=loading` | 1440×1000 | [32-payments-owner/11-loading-desktop-1440.webp](screens/32-payments-owner/11-loading-desktop-1440.webp) |
| Loading — phone 390 | `Payments.html?state=loading` | 390×844 | [32-payments-owner/12-loading-phone-390.webp](screens/32-payments-owner/12-loading-phone-390.webp) |

## 33 · Finance & reports «المالية والتقارير» (owner)

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| الدخل — desktop 1440 | `Finance.html` | 1440×1000 | [33-finance-reports-owner/01-desktop-1440.webp](screens/33-finance-reports-owner/01-desktop-1440.webp) |
| الدخل — phone 390 | `Finance.html` | 390×844 | [33-finance-reports-owner/02-phone-390.webp](screens/33-finance-reports-owner/02-phone-390.webp) |
| الديون — desktop 1440 | `Finance.html?tab=debts` | 1440×1000 | [33-finance-reports-owner/03-desktop-1440.webp](screens/33-finance-reports-owner/03-desktop-1440.webp) |
| الديون — phone 390 | `Finance.html?tab=debts` | 390×844 | [33-finance-reports-owner/04-phone-390.webp](screens/33-finance-reports-owner/04-phone-390.webp) |
| الإشغال — desktop 1440 | `Finance.html?tab=occupancy` | 1440×1000 | [33-finance-reports-owner/05-desktop-1440.webp](screens/33-finance-reports-owner/05-desktop-1440.webp) |
| الإشغال — phone 390 | `Finance.html?tab=occupancy` | 390×844 | [33-finance-reports-owner/06-phone-390.webp](screens/33-finance-reports-owner/06-phone-390.webp) |
| الدخل · dark — desktop 1440 | `Finance.html?theme=dark` | 1440×1000 | [33-finance-reports-owner/07-dark-desktop-1440.webp](screens/33-finance-reports-owner/07-dark-desktop-1440.webp) |
| الدخل · dark — phone 390 | `Finance.html?theme=dark` | 390×844 | [33-finance-reports-owner/08-dark-phone-390.webp](screens/33-finance-reports-owner/08-dark-phone-390.webp) |

## 34 · Packages & prices «الباقات والأسعار» (owner)

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Packages & prices — desktop 1440 | `Packages.html` | 1440×1000 | [34-packages-prices-owner/01-packages-prices-desktop-1440.webp](screens/34-packages-prices-owner/01-packages-prices-desktop-1440.webp) |
| Packages & prices — phone 390 | `Packages.html` | 390×844 | [34-packages-prices-owner/02-packages-prices-phone-390.webp](screens/34-packages-prices-owner/02-packages-prices-phone-390.webp) |
| New package sheet · live summary — desktop 1440 | `Packages.html?sheet=new` | 1440×1000 | [34-packages-prices-owner/03-new-package-sheet-live-summary-desktop-1440.webp](screens/34-packages-prices-owner/03-new-package-sheet-live-summary-desktop-1440.webp) |
| New package sheet · live summary — phone 390 | `Packages.html?sheet=new` | 390×844 | [34-packages-prices-owner/04-new-package-sheet-live-summary-phone-390.webp](screens/34-packages-prices-owner/04-new-package-sheet-live-summary-phone-390.webp) |
| Edit usage-based package — desktop 1440 | `Packages.html?edit=p4` | 1440×1000 | [34-packages-prices-owner/05-edit-usage-based-package-desktop-1440.webp](screens/34-packages-prices-owner/05-edit-usage-based-package-desktop-1440.webp) |
| Edit usage-based package — phone 390 | `Packages.html?edit=p4` | 390×844 | [34-packages-prices-owner/06-edit-usage-based-package-phone-390.webp](screens/34-packages-prices-owner/06-edit-usage-based-package-phone-390.webp) |
| Space profile · link to prices — desktop 1440 | `Owner space profile.html#prices` | 1440×1000 | [34-packages-prices-owner/07-space-profile-link-to-prices-desktop-1440.webp](screens/34-packages-prices-owner/07-space-profile-link-to-prices-desktop-1440.webp) |
| Space profile · link to prices — phone 390 | `Owner space profile.html#prices` | 390×844 | [34-packages-prices-owner/08-space-profile-link-to-prices-phone-390.webp](screens/34-packages-prices-owner/08-space-profile-link-to-prices-phone-390.webp) |

## 35 · Batch 3b fixes

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Finance · الدخل — desktop 1440 | `Finance.html` | 1440×1000 | [33-finance-reports-owner/01-desktop-1440.webp](screens/33-finance-reports-owner/01-desktop-1440.webp) |
| Finance · الدخل — phone 390 | `Finance.html` | 390×844 | [33-finance-reports-owner/02-phone-390.webp](screens/33-finance-reports-owner/02-phone-390.webp) |
| Finance · الإشغال (no definition line) — desktop 1440 | `Finance.html?tab=occupancy` | 1440×1000 | [33-finance-reports-owner/05-desktop-1440.webp](screens/33-finance-reports-owner/05-desktop-1440.webp) |
| Finance · الإشغال (no definition line) — phone 390 | `Finance.html?tab=occupancy` | 390×844 | [33-finance-reports-owner/06-phone-390.webp](screens/33-finance-reports-owner/06-phone-390.webp) |

## 36 · Space profile «ملف المساحة»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Space profile — desktop 1440 | `Owner space profile.html` | 1440×1000 | [30-owner-space-profile-kept/01-space-profile-desktop-1440.webp](screens/30-owner-space-profile-kept/01-space-profile-desktop-1440.webp) |
| Space profile — phone 390 | `Owner space profile.html` | 390×844 | [30-owner-space-profile-kept/02-space-profile-phone-390.webp](screens/30-owner-space-profile-kept/02-space-profile-phone-390.webp) |
| Capacity section — desktop 1440 | `Owner space profile.html#capacity` | 1440×1000 | [36-space-profile/03-capacity-section-desktop-1440.webp](screens/36-space-profile/03-capacity-section-desktop-1440.webp) |
| Capacity section — phone 390 | `Owner space profile.html#capacity` | 390×844 | [36-space-profile/04-capacity-section-phone-390.webp](screens/36-space-profile/04-capacity-section-phone-390.webp) |

## 37 · Staff «الموظفون» (owner)

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Staff list — desktop 1440 | `Staff.html` | 1440×1000 | [37-staff-owner/01-staff-list-desktop-1440.webp](screens/37-staff-owner/01-staff-list-desktop-1440.webp) |
| Staff list — phone 390 | `Staff.html` | 390×844 | [37-staff-owner/02-staff-list-phone-390.webp](screens/37-staff-owner/02-staff-list-phone-390.webp) |
| Add staff sheet — desktop 1440 | `Staff.html?sheet=add` | 1440×1000 | [37-staff-owner/03-add-staff-sheet-desktop-1440.webp](screens/37-staff-owner/03-add-staff-sheet-desktop-1440.webp) |
| Add staff sheet — phone 390 | `Staff.html?sheet=add` | 390×844 | [37-staff-owner/04-add-staff-sheet-phone-390.webp](screens/37-staff-owner/04-add-staff-sheet-phone-390.webp) |
| Temporary password (shown once) — desktop 1440 | `Staff.html?pass=1` | 1440×1000 | [37-staff-owner/05-temporary-password-shown-once-desktop-1440.webp](screens/37-staff-owner/05-temporary-password-shown-once-desktop-1440.webp) |
| Temporary password (shown once) — phone 390 | `Staff.html?pass=1` | 390×844 | [37-staff-owner/06-temporary-password-shown-once-phone-390.webp](screens/37-staff-owner/06-temporary-password-shown-once-phone-390.webp) |
| Email already has an account → «ربط» — desktop 1440 | `Staff.html?sheet=add&email=nour@example.com` | 1440×1000 | [37-staff-owner/07-email-already-has-an-account-desktop-1440.webp](screens/37-staff-owner/07-email-already-has-an-account-desktop-1440.webp) |
| Email already has an account → «ربط» — phone 390 | `Staff.html?sheet=add&email=nour@example.com` | 390×844 | [37-staff-owner/08-email-already-has-an-account-phone-390.webp](screens/37-staff-owner/08-email-already-has-an-account-phone-390.webp) |
| Suspend (confirm) — desktop 1440 | `Staff.html?stop=1` | 1440×1000 | [37-staff-owner/09-suspend-confirm-desktop-1440.webp](screens/37-staff-owner/09-suspend-confirm-desktop-1440.webp) |
| Suspend (confirm) — phone 390 | `Staff.html?stop=1` | 390×844 | [37-staff-owner/10-suspend-confirm-phone-390.webp](screens/37-staff-owner/10-suspend-confirm-phone-390.webp) |
| Empty — desktop 1440 | `Staff.html?state=empty` | 1440×1000 | [37-staff-owner/11-empty-desktop-1440.webp](screens/37-staff-owner/11-empty-desktop-1440.webp) |
| Empty — phone 390 | `Staff.html?state=empty` | 390×844 | [37-staff-owner/12-empty-phone-390.webp](screens/37-staff-owner/12-empty-phone-390.webp) |

## 38 · Announcements «الإعلانات» (owner + reception)

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Active · owner — desktop 1440 | `Announcements.html` | 1440×1000 | [38-announcements-owner-reception/01-active-owner-desktop-1440.webp](screens/38-announcements-owner-reception/01-active-owner-desktop-1440.webp) |
| Active · owner — phone 390 | `Announcements.html` | 390×844 | [38-announcements-owner-reception/02-active-owner-phone-390.webp](screens/38-announcements-owner-reception/02-active-owner-phone-390.webp) |
| Active · reception — desktop 1440 | `Announcements.html?role=reception` | 1440×1000 | [38-announcements-owner-reception/03-active-reception-desktop-1440.webp](screens/38-announcements-owner-reception/03-active-reception-desktop-1440.webp) |
| Active · reception — phone 390 | `Announcements.html?role=reception` | 390×844 | [38-announcements-owner-reception/04-active-reception-phone-390.webp](screens/38-announcements-owner-reception/04-active-reception-phone-390.webp) |
| Scheduled closure · extend (owner) — desktop 1440 | `Announcements.html?tab=scheduled&edit=a1` | 1440×1000 | [38-announcements-owner-reception/05-scheduled-closure-extend-owner-desktop-1440.webp](screens/38-announcements-owner-reception/05-scheduled-closure-extend-owner-desktop-1440.webp) |
| Scheduled closure · extend (owner) — phone 390 | `Announcements.html?tab=scheduled&edit=a1` | 390×844 | [38-announcements-owner-reception/06-scheduled-closure-extend-owner-phone-390.webp](screens/38-announcements-owner-reception/06-scheduled-closure-extend-owner-phone-390.webp) |
| Closure · reception sees note — desktop 1440 | `Announcements.html?role=reception&tab=scheduled&edit=a1` | 1440×1000 | [38-announcements-owner-reception/07-closure-reception-sees-note-desktop-1440.webp](screens/38-announcements-owner-reception/07-closure-reception-sees-note-desktop-1440.webp) |
| Closure · reception sees note — phone 390 | `Announcements.html?role=reception&tab=scheduled&edit=a1` | 390×844 | [38-announcements-owner-reception/08-closure-reception-sees-note-phone-390.webp](screens/38-announcements-owner-reception/08-closure-reception-sees-note-phone-390.webp) |
| Ended closure · extension done — desktop 1440 | `Announcements.html?tab=ended&edit=a4` | 1440×1000 | [38-announcements-owner-reception/09-ended-closure-extension-done-desktop-1440.webp](screens/38-announcements-owner-reception/09-ended-closure-extension-done-desktop-1440.webp) |
| Ended closure · extension done — phone 390 | `Announcements.html?tab=ended&edit=a4` | 390×844 | [38-announcements-owner-reception/10-ended-closure-extension-done-phone-390.webp](screens/38-announcements-owner-reception/10-ended-closure-extension-done-phone-390.webp) |
| New announcement sheet — desktop 1440 | `Announcements.html?sheet=new&type=event` | 1440×1000 | [38-announcements-owner-reception/11-new-announcement-sheet-desktop-1440.webp](screens/38-announcements-owner-reception/11-new-announcement-sheet-desktop-1440.webp) |
| New announcement sheet — phone 390 | `Announcements.html?sheet=new&type=event` | 390×844 | [38-announcements-owner-reception/12-new-announcement-sheet-phone-390.webp](screens/38-announcements-owner-reception/12-new-announcement-sheet-phone-390.webp) |
| Empty — desktop 1440 | `Announcements.html?state=empty` | 1440×1000 | [38-announcements-owner-reception/13-empty-desktop-1440.webp](screens/38-announcements-owner-reception/13-empty-desktop-1440.webp) |
| Empty — phone 390 | `Announcements.html?state=empty` | 390×844 | [38-announcements-owner-reception/14-empty-phone-390.webp](screens/38-announcements-owner-reception/14-empty-phone-390.webp) |

## 39 · Data reports «بلاغات البيانات» (owner)

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| List — desktop 1440 | `Data reports.html` | 1440×1000 | [39-data-reports-owner/01-list-desktop-1440.webp](screens/39-data-reports-owner/01-list-desktop-1440.webp) |
| List — phone 390 | `Data reports.html` | 390×844 | [39-data-reports-owner/02-list-phone-390.webp](screens/39-data-reports-owner/02-list-phone-390.webp) |
| Open report — desktop 1440 | `Data reports.html?open=d1` | 1440×1000 | [39-data-reports-owner/03-open-report-desktop-1440.webp](screens/39-data-reports-owner/03-open-report-desktop-1440.webp) |
| Open report — phone 390 | `Data reports.html?open=d1` | 390×844 | [39-data-reports-owner/04-open-report-phone-390.webp](screens/39-data-reports-owner/04-open-report-phone-390.webp) |
| Filter · new — desktop 1440 | `Data reports.html?status=new` | 1440×1000 | [39-data-reports-owner/05-filter-new-desktop-1440.webp](screens/39-data-reports-owner/05-filter-new-desktop-1440.webp) |
| Filter · new — phone 390 | `Data reports.html?status=new` | 390×844 | [39-data-reports-owner/06-filter-new-phone-390.webp](screens/39-data-reports-owner/06-filter-new-phone-390.webp) |
| Empty — desktop 1440 | `Data reports.html?state=empty` | 1440×1000 | [39-data-reports-owner/07-empty-desktop-1440.webp](screens/39-data-reports-owner/07-empty-desktop-1440.webp) |
| Empty — phone 390 | `Data reports.html?state=empty` | 390×844 | [39-data-reports-owner/08-empty-phone-390.webp](screens/39-data-reports-owner/08-empty-phone-390.webp) |

## 40 · Settings «الإعدادات» (owner)

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Owner settings — desktop 1440 | `Owner settings.html` | 1440×1000 | [40-settings-owner/01-owner-settings-desktop-1440.webp](screens/40-settings-owner/01-owner-settings-desktop-1440.webp) |
| Owner settings — phone 390 | `Owner settings.html` | 390×844 | [40-settings-owner/02-owner-settings-phone-390.webp](screens/40-settings-owner/02-owner-settings-phone-390.webp) |

## 41 · Fix · DS date picker

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Announcement sheet — desktop 1440 | `Announcements.html?sheet=new&type=event` | 1440×1000 | [38-announcements-owner-reception/11-new-announcement-sheet-desktop-1440.webp](screens/38-announcements-owner-reception/11-new-announcement-sheet-desktop-1440.webp) |
| Announcement sheet — phone 390 | `Announcements.html?sheet=new&type=event` | 390×844 | [38-announcements-owner-reception/12-new-announcement-sheet-phone-390.webp](screens/38-announcements-owner-reception/12-new-announcement-sheet-phone-390.webp) |
| Customer file · attendance range — desktop 1440 | `Customer file.html?id=m4&tab=att` | 1440×1000 | [27-customer-file/03-attendance-statement-usage-based-desktop-1440.webp](screens/27-customer-file/03-attendance-statement-usage-based-desktop-1440.webp) |
| Customer file · attendance range — phone 390 | `Customer file.html?id=m4&tab=att` | 390×844 | [27-customer-file/04-attendance-statement-usage-based-phone-390.webp](screens/27-customer-file/04-attendance-statement-usage-based-phone-390.webp) |

## 42 · Admin — overview «نظرة عامة»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Overview — desktop 1440 | `Admin overview.html` | 1440×1000 | [42-admin-overview/01-overview-desktop-1440.webp](screens/42-admin-overview/01-overview-desktop-1440.webp) |
| Overview — phone 390 | `Admin overview.html` | 390×844 | [42-admin-overview/02-overview-phone-390.webp](screens/42-admin-overview/02-overview-phone-390.webp) |

## 43 · Admin — spaces «المساحات»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Spaces — desktop 1440 | `Admin spaces.html` | 1440×1000 | [43-admin-spaces/01-spaces-desktop-1440.webp](screens/43-admin-spaces/01-spaces-desktop-1440.webp) |
| Spaces — phone 390 | `Admin spaces.html` | 390×844 | [43-admin-spaces/02-spaces-phone-390.webp](screens/43-admin-spaces/02-spaces-phone-390.webp) |
| Stale only — desktop 1440 | `Admin spaces.html?stale=1` | 1440×1000 | [43-admin-spaces/03-stale-only-desktop-1440.webp](screens/43-admin-spaces/03-stale-only-desktop-1440.webp) |
| Stale only — phone 390 | `Admin spaces.html?stale=1` | 390×844 | [43-admin-spaces/04-stale-only-phone-390.webp](screens/43-admin-spaces/04-stale-only-phone-390.webp) |
| Link owner — desktop 1440 | `Admin spaces.html?link=golden` | 1440×1000 | [43-admin-spaces/05-link-owner-desktop-1440.webp](screens/43-admin-spaces/05-link-owner-desktop-1440.webp) |
| Link owner — phone 390 | `Admin spaces.html?link=golden` | 390×844 | [43-admin-spaces/06-link-owner-phone-390.webp](screens/43-admin-spaces/06-link-owner-phone-390.webp) |
| Unlink last owner → unverified — desktop 1440 | `Admin spaces.html?unlink=numberone` | 1440×1000 | [43-admin-spaces/07-unlink-last-owner-unverified-desktop-1440.webp](screens/43-admin-spaces/07-unlink-last-owner-unverified-desktop-1440.webp) |
| Unlink last owner → unverified — phone 390 | `Admin spaces.html?unlink=numberone` | 390×844 | [43-admin-spaces/08-unlink-last-owner-unverified-phone-390.webp](screens/43-admin-spaces/08-unlink-last-owner-unverified-phone-390.webp) |
| Delete (soft) — desktop 1440 | `Admin spaces.html?del=palm` | 1440×1000 | [43-admin-spaces/09-delete-soft-desktop-1440.webp](screens/43-admin-spaces/09-delete-soft-desktop-1440.webp) |
| Delete (soft) — phone 390 | `Admin spaces.html?del=palm` | 390×844 | [43-admin-spaces/10-delete-soft-phone-390.webp](screens/43-admin-spaces/10-delete-soft-phone-390.webp) |
| Edit unverified · banner — desktop 1440 | `Admin space edit.html?id=golden` | 1440×1000 | [43-admin-spaces/11-edit-unverified-banner-desktop-1440.webp](screens/43-admin-spaces/11-edit-unverified-banner-desktop-1440.webp) |
| Edit unverified · banner — phone 390 | `Admin space edit.html?id=golden` | 390×844 | [43-admin-spaces/12-edit-unverified-banner-phone-390.webp](screens/43-admin-spaces/12-edit-unverified-banner-phone-390.webp) |
| Verified · read-only — desktop 1440 | `Admin space edit.html?id=focus` | 1440×1000 | [43-admin-spaces/13-verified-read-only-desktop-1440.webp](screens/43-admin-spaces/13-verified-read-only-desktop-1440.webp) |
| Verified · read-only — phone 390 | `Admin space edit.html?id=focus` | 390×844 | [43-admin-spaces/14-verified-read-only-phone-390.webp](screens/43-admin-spaces/14-verified-read-only-phone-390.webp) |
| Add space — desktop 1440 | `Admin space edit.html?new=1` | 1440×1000 | [43-admin-spaces/15-add-space-desktop-1440.webp](screens/43-admin-spaces/15-add-space-desktop-1440.webp) |
| Add space — phone 390 | `Admin space edit.html?new=1` | 390×844 | [43-admin-spaces/16-add-space-phone-390.webp](screens/43-admin-spaces/16-add-space-phone-390.webp) |

## 44 · Admin — owners «أصحاب المساحات»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Owners — desktop 1440 | `Admin owners.html` | 1440×1000 | [44-admin-owners/01-owners-desktop-1440.webp](screens/44-admin-owners/01-owners-desktop-1440.webp) |
| Owners — phone 390 | `Admin owners.html` | 390×844 | [44-admin-owners/02-owners-phone-390.webp](screens/44-admin-owners/02-owners-phone-390.webp) |
| Add owner — desktop 1440 | `Admin owners.html?sheet=add` | 1440×1000 | [44-admin-owners/03-add-owner-desktop-1440.webp](screens/44-admin-owners/03-add-owner-desktop-1440.webp) |
| Add owner — phone 390 | `Admin owners.html?sheet=add` | 390×844 | [44-admin-owners/04-add-owner-phone-390.webp](screens/44-admin-owners/04-add-owner-phone-390.webp) |
| Existing account → upgrade and link — desktop 1440 | `Admin owners.html?sheet=add&email=nour@example.com` | 1440×1000 | [44-admin-owners/05-existing-account-upgrade-and-link-desktop-1440.webp](screens/44-admin-owners/05-existing-account-upgrade-and-link-desktop-1440.webp) |
| Existing account → upgrade and link — phone 390 | `Admin owners.html?sheet=add&email=nour@example.com` | 390×844 | [44-admin-owners/06-existing-account-upgrade-and-link-phone-390.webp](screens/44-admin-owners/06-existing-account-upgrade-and-link-phone-390.webp) |
| Temporary password (once) — desktop 1440 | `Admin owners.html?pass=1` | 1440×1000 | [44-admin-owners/07-temporary-password-once-desktop-1440.webp](screens/44-admin-owners/07-temporary-password-once-desktop-1440.webp) |
| Temporary password (once) — phone 390 | `Admin owners.html?pass=1` | 390×844 | [44-admin-owners/08-temporary-password-once-phone-390.webp](screens/44-admin-owners/08-temporary-password-once-phone-390.webp) |
| Unlink last owner (confirm) — desktop 1440 | `Admin owners.html?unlink=1` | 1440×1000 | [44-admin-owners/09-unlink-last-owner-confirm-desktop-1440.webp](screens/44-admin-owners/09-unlink-last-owner-confirm-desktop-1440.webp) |
| Unlink last owner (confirm) — phone 390 | `Admin owners.html?unlink=1` | 390×844 | [44-admin-owners/10-unlink-last-owner-confirm-phone-390.webp](screens/44-admin-owners/10-unlink-last-owner-confirm-phone-390.webp) |
| Link to more spaces — desktop 1440 | `Admin owners.html?link=o1` | 1440×1000 | [44-admin-owners/11-link-to-more-spaces-desktop-1440.webp](screens/44-admin-owners/11-link-to-more-spaces-desktop-1440.webp) |
| Link to more spaces — phone 390 | `Admin owners.html?link=o1` | 390×844 | [44-admin-owners/12-link-to-more-spaces-phone-390.webp](screens/44-admin-owners/12-link-to-more-spaces-phone-390.webp) |

## 45 · Admin — data reports (all spaces)

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| All reports — desktop 1440 | `Admin reports.html` | 1440×1000 | [45-admin-data-reports-all-spaces/01-all-reports-desktop-1440.webp](screens/45-admin-data-reports-all-spaces/01-all-reports-desktop-1440.webp) |
| All reports — phone 390 | `Admin reports.html` | 390×844 | [45-admin-data-reports-all-spaces/02-all-reports-phone-390.webp](screens/45-admin-data-reports-all-spaces/02-all-reports-phone-390.webp) |
| Unverified · resolve — desktop 1440 | `Admin reports.html?open=r1` | 1440×1000 | [45-admin-data-reports-all-spaces/03-unverified-resolve-desktop-1440.webp](screens/45-admin-data-reports-all-spaces/03-unverified-resolve-desktop-1440.webp) |
| Unverified · resolve — phone 390 | `Admin reports.html?open=r1` | 390×844 | [45-admin-data-reports-all-spaces/04-unverified-resolve-phone-390.webp](screens/45-admin-data-reports-all-spaces/04-unverified-resolve-phone-390.webp) |
| Verified · read-only — desktop 1440 | `Admin reports.html?open=r3` | 1440×1000 | [45-admin-data-reports-all-spaces/05-verified-read-only-desktop-1440.webp](screens/45-admin-data-reports-all-spaces/05-verified-read-only-desktop-1440.webp) |
| Verified · read-only — phone 390 | `Admin reports.html?open=r3` | 390×844 | [45-admin-data-reports-all-spaces/06-verified-read-only-phone-390.webp](screens/45-admin-data-reports-all-spaces/06-verified-read-only-phone-390.webp) |
| Filter · new — desktop 1440 | `Admin reports.html?status=new` | 1440×1000 | [45-admin-data-reports-all-spaces/07-filter-new-desktop-1440.webp](screens/45-admin-data-reports-all-spaces/07-filter-new-desktop-1440.webp) |
| Filter · new — phone 390 | `Admin reports.html?status=new` | 390×844 | [45-admin-data-reports-all-spaces/08-filter-new-phone-390.webp](screens/45-admin-data-reports-all-spaces/08-filter-new-phone-390.webp) |

## 46 · Admin — users «المستخدمون»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Users — desktop 1440 | `Admin users.html` | 1440×1000 | [46-admin-users/01-users-desktop-1440.webp](screens/46-admin-users/01-users-desktop-1440.webp) |
| Users — phone 390 | `Admin users.html` | 390×844 | [46-admin-users/02-users-phone-390.webp](screens/46-admin-users/02-users-phone-390.webp) |
| Suspend (confirm) — desktop 1440 | `Admin users.html?suspend=1` | 1440×1000 | [46-admin-users/03-suspend-confirm-desktop-1440.webp](screens/46-admin-users/03-suspend-confirm-desktop-1440.webp) |
| Suspend (confirm) — phone 390 | `Admin users.html?suspend=1` | 390×844 | [46-admin-users/04-suspend-confirm-phone-390.webp](screens/46-admin-users/04-suspend-confirm-phone-390.webp) |
| Change role — desktop 1440 | `Admin users.html?changerole=1` | 1440×1000 | [46-admin-users/05-change-role-desktop-1440.webp](screens/46-admin-users/05-change-role-desktop-1440.webp) |
| Change role — phone 390 | `Admin users.html?changerole=1` | 390×844 | [46-admin-users/06-change-role-phone-390.webp](screens/46-admin-users/06-change-role-phone-390.webp) |
| Issue temporary password — desktop 1440 | `Admin users.html?temp=1` | 1440×1000 | [46-admin-users/07-issue-temporary-password-desktop-1440.webp](screens/46-admin-users/07-issue-temporary-password-desktop-1440.webp) |
| Issue temporary password — phone 390 | `Admin users.html?temp=1` | 390×844 | [46-admin-users/08-issue-temporary-password-phone-390.webp](screens/46-admin-users/08-issue-temporary-password-phone-390.webp) |

## 47 · Admin — lookups «القوائم»

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Governorates and areas — desktop 1440 | `Admin lookups.html` | 1440×1000 | [47-admin-lookups/01-governorates-and-areas-desktop-1440.webp](screens/47-admin-lookups/01-governorates-and-areas-desktop-1440.webp) |
| Governorates and areas — phone 390 | `Admin lookups.html` | 390×844 | [47-admin-lookups/02-governorates-and-areas-phone-390.webp](screens/47-admin-lookups/02-governorates-and-areas-phone-390.webp) |
| Edit area (الشجاعية, hidden) — desktop 1440 | `Admin lookups.html?edit=area` | 1440×1000 | [47-admin-lookups/03-edit-area-hidden-desktop-1440.webp](screens/47-admin-lookups/03-edit-area-hidden-desktop-1440.webp) |
| Edit area (الشجاعية, hidden) — phone 390 | `Admin lookups.html?edit=area` | 390×844 | [47-admin-lookups/04-edit-area-hidden-phone-390.webp](screens/47-admin-lookups/04-edit-area-hidden-phone-390.webp) |
| Amenities — desktop 1440 | `Admin lookups.html?tab=amenities` | 1440×1000 | [47-admin-lookups/05-amenities-desktop-1440.webp](screens/47-admin-lookups/05-amenities-desktop-1440.webp) |
| Amenities — phone 390 | `Admin lookups.html?tab=amenities` | 390×844 | [47-admin-lookups/06-amenities-phone-390.webp](screens/47-admin-lookups/06-amenities-phone-390.webp) |

## 48 · Admin — audit log + platform settings

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Audit log — desktop 1440 | `Admin audit.html` | 1440×1000 | [48-admin-audit-log-platform-settings/01-audit-log-desktop-1440.webp](screens/48-admin-audit-log-platform-settings/01-audit-log-desktop-1440.webp) |
| Audit log — phone 390 | `Admin audit.html` | 390×844 | [48-admin-audit-log-platform-settings/02-audit-log-phone-390.webp](screens/48-admin-audit-log-platform-settings/02-audit-log-phone-390.webp) |
| Platform settings — desktop 1440 | `Admin settings.html` | 1440×1000 | [48-admin-audit-log-platform-settings/03-platform-settings-desktop-1440.webp](screens/48-admin-audit-log-platform-settings/03-platform-settings-desktop-1440.webp) |
| Platform settings — phone 390 | `Admin settings.html` | 390×844 | [48-admin-audit-log-platform-settings/04-platform-settings-phone-390.webp](screens/48-admin-audit-log-platform-settings/04-platform-settings-phone-390.webp) |

## 49 · Fixes · batch 4

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Lookups · seeded list | `Admin lookups.html` | 1440×1000 | [47-admin-lookups/01-governorates-and-areas-desktop-1440.webp](screens/47-admin-lookups/01-governorates-and-areas-desktop-1440.webp) |
| Space profile · 24-hour hours & shifts | `Owner space profile.html#hours` | 1440×1000 | [49-fixes-batch-4/02-space-profile-24-hour-hours-shifts.webp](screens/49-fixes-batch-4/02-space-profile-24-hour-hours-shifts.webp) |
| Admin · verified space as text | `Admin space edit.html?id=focus` | 1440×1000 | [43-admin-spaces/13-verified-read-only-desktop-1440.webp](screens/43-admin-spaces/13-verified-read-only-desktop-1440.webp) |
| Admin · unverified edit · 24-hour | `Admin space edit.html?id=golden#hours` | 1440×1000 | [49-fixes-batch-4/04-admin-unverified-edit-24-hour.webp](screens/49-fixes-batch-4/04-admin-unverified-edit-24-hour.webp) |

## 50 · Dashboard variants — Arabic dark

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Desk · dark | `Desk.html?theme=dark` | 1440×1000 | [50-dashboard-variants-arabic-dark/01-desk-dark.webp](screens/50-dashboard-variants-arabic-dark/01-desk-dark.webp) |
| Desk · dark · outside hours (disabled) | `Desk.html?theme=dark&hours=closed` | 1440×1000 | [50-dashboard-variants-arabic-dark/02-desk-dark-outside-hours-disabled.webp](screens/50-dashboard-variants-arabic-dark/02-desk-dark-outside-hours-disabled.webp) |
| Customer file · dark · owes | `Customer file.html?theme=dark&id=m6` | 1440×1000 | [50-dashboard-variants-arabic-dark/03-customer-file-dark-owes.webp](screens/50-dashboard-variants-arabic-dark/03-customer-file-dark-owes.webp) |
| Customer file · dark · credit | `Customer file.html?theme=dark&id=m15` | 1440×1000 | [50-dashboard-variants-arabic-dark/04-customer-file-dark-credit.webp](screens/50-dashboard-variants-arabic-dark/04-customer-file-dark-credit.webp) |
| Customers · dark · badges | `Customers.html?theme=dark` | 1440×1000 | [50-dashboard-variants-arabic-dark/05-customers-dark-badges.webp](screens/50-dashboard-variants-arabic-dark/05-customers-dark-badges.webp) |
| Payments · dark | `Payments.html?theme=dark&voided=1` | 1440×1000 | [50-dashboard-variants-arabic-dark/06-payments-dark.webp](screens/50-dashboard-variants-arabic-dark/06-payments-dark.webp) |
| Finance · الدخل · dark | `Finance.html?theme=dark` | 1440×1000 | [33-finance-reports-owner/07-dark-desktop-1440.webp](screens/33-finance-reports-owner/07-dark-desktop-1440.webp) |
| Finance · الديون · dark | `Finance.html?theme=dark&tab=debts` | 1440×1000 | [50-dashboard-variants-arabic-dark/08-finance-dark.webp](screens/50-dashboard-variants-arabic-dark/08-finance-dark.webp) |
| Finance · الإشغال · dark | `Finance.html?theme=dark&tab=occupancy` | 1440×1000 | [50-dashboard-variants-arabic-dark/09-finance-dark.webp](screens/50-dashboard-variants-arabic-dark/09-finance-dark.webp) |
| Packages & prices · dark | `Packages.html?theme=dark` | 1440×1000 | [50-dashboard-variants-arabic-dark/10-packages-prices-dark.webp](screens/50-dashboard-variants-arabic-dark/10-packages-prices-dark.webp) |
| Staff · dark | `Staff.html?theme=dark` | 1440×1000 | [50-dashboard-variants-arabic-dark/11-staff-dark.webp](screens/50-dashboard-variants-arabic-dark/11-staff-dark.webp) |
| Admin overview · dark | `Admin overview.html?theme=dark` | 1440×1000 | [50-dashboard-variants-arabic-dark/12-admin-overview-dark.webp](screens/50-dashboard-variants-arabic-dark/12-admin-overview-dark.webp) |
| Admin spaces · dark | `Admin spaces.html?theme=dark` | 1440×1000 | [50-dashboard-variants-arabic-dark/13-admin-spaces-dark.webp](screens/50-dashboard-variants-arabic-dark/13-admin-spaces-dark.webp) |
| Admin lookups · dark | `Admin lookups.html?theme=dark` | 1440×1000 | [50-dashboard-variants-arabic-dark/14-admin-lookups-dark.webp](screens/50-dashboard-variants-arabic-dark/14-admin-lookups-dark.webp) |
| Admin users · dark | `Admin users.html?theme=dark` | 1440×1000 | [50-dashboard-variants-arabic-dark/15-admin-users-dark.webp](screens/50-dashboard-variants-arabic-dark/15-admin-users-dark.webp) |

## 51 · Dashboard variants — English LTR light

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Front desk | `Desk.html?lang=en` | 1440×1000 | [51-dashboard-variants-english-ltr-light/01-front-desk.webp](screens/51-dashboard-variants-english-ltr-light/01-front-desk.webp) |
| Front desk · check-out dialog | `Desk.html?lang=en&dialog=checkout&pid=pv0` | 1440×1000 | [51-dashboard-variants-english-ltr-light/02-front-desk-check-out-dialog.webp](screens/51-dashboard-variants-english-ltr-light/02-front-desk-check-out-dialog.webp) |
| Customer file | `Customer file.html?lang=en&id=m6` | 1440×1000 | [51-dashboard-variants-english-ltr-light/03-customer-file.webp](screens/51-dashboard-variants-english-ltr-light/03-customer-file.webp) |
| Finance · Income | `Finance.html?lang=en` | 1440×1000 | [51-dashboard-variants-english-ltr-light/04-finance-income.webp](screens/51-dashboard-variants-english-ltr-light/04-finance-income.webp) |
| Admin spaces | `Admin spaces.html?lang=en` | 1440×1000 | [51-dashboard-variants-english-ltr-light/05-admin-spaces.webp](screens/51-dashboard-variants-english-ltr-light/05-admin-spaces.webp) |
| Admin space · read-only | `Admin space edit.html?lang=en&id=focus` | 1440×1000 | [51-dashboard-variants-english-ltr-light/06-admin-space-read-only.webp](screens/51-dashboard-variants-english-ltr-light/06-admin-space-read-only.webp) |

## 52 · Dashboard variants — phone 390

| Frame | Prototype URL | Viewport | Screenshot |
|---|---|---|---|
| Desk · reception | `Desk.html?role=reception` | 390×844 | [21-front-desk-reception-vs-owner/02-desk-reception-phone-390.webp](screens/21-front-desk-reception-vs-owner/02-desk-reception-phone-390.webp) |
| Customers | `Customers.html` | 390×844 | [26-customers-reception-vs-owner/04-customers-owner-phone-390.webp](screens/26-customers-reception-vs-owner/04-customers-owner-phone-390.webp) |
| Customer file | `Customer file.html?id=m6` | 390×844 | [27-customer-file/02-memberships-partly-paid-phone-390.webp](screens/27-customer-file/02-memberships-partly-paid-phone-390.webp) |
| Finance | `Finance.html` | 390×844 | [33-finance-reports-owner/02-phone-390.webp](screens/33-finance-reports-owner/02-phone-390.webp) |
| Admin spaces | `Admin spaces.html` | 390×844 | [43-admin-spaces/02-spaces-phone-390.webp](screens/43-admin-spaces/02-spaces-phone-390.webp) |
| Payments | `Payments.html` | 390×844 | [32-payments-owner/02-ledger-this-month-phone-390.webp](screens/32-payments-owner/02-ledger-this-month-phone-390.webp) |
| Desk · dark | `Desk.html?role=reception&theme=dark` | 390×844 | [52-dashboard-variants-phone-390/07-desk-dark.webp](screens/52-dashboard-variants-phone-390/07-desk-dark.webp) |
| Customers · English | `Customers.html?lang=en` | 390×844 | [52-dashboard-variants-phone-390/08-customers-english.webp](screens/52-dashboard-variants-phone-390/08-customers-english.webp) |
