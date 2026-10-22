# 134. Each render of the map rebuilds every marker

**Status:** Open · **Date:** 2026-10-22

**Evidence:** the directory's map words every pin's card on each render (`useDirectoryMap`, `cardViewOf` with today's hours, for every pin), and `MarkerMap` hands each mark a new `eventHandlers` object, which React Leaflet unbinds and binds again, so every mark renders anew (#105). Each key typed in the map's search renders the view again, so up to 1,000 marks are rebuilt per key, which may make typing lag on a weak phone; not measured (#105's review, item 9).

**Resolves when:** the marks are memoised on the answer and the language, with stable handlers (or a memoised mark), and typing on the map with the pins' ceiling of marks is measured smooth on a phone.
