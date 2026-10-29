# Validation — 29 October 2026

## Automated

33 tests pass across five suites:

- Excel interpretation and safe reimports: wide/long layouts, Finnish/Swedish/English headings, reordered columns, title rows before headers, repeated headers, cultural categories, date validation, decimal commas, zeros, missing scores, scale bounds, conflicting duplicates, actual multi-sheet XLSX parsing, stable identifiers, enriched metadata preservation and review-only entries.
- Statistics and normalization: paired Pearson coefficients, small/constant samples, original scale conversion, population standard deviation and missing-score behavior.
- IndexedDB: persistence, recovery checkpoints, per-user isolation and complete cache removal on sign-out.
- PostgreSQL: RLS isolation, direct-write denial, admin-only RPCs, same stable IDs in different clubs, atomic rollback, stale revision rejection, verified-email invitations, one-time consumption, reader restrictions and anonymous denial. Runs the actual schema in PGlite with a simulated Supabase auth schema.

`tsc -b` and the Vite production build pass. The generated PWA precache contains 34 entries, including code split routes, local fonts, icons and map outlines. The initial JavaScript entry is approximately 267 kB (87 kB gzip); the Excel parser loads with the import route.

## Browser verification

Using the app's in-app browser:

- 1440 × 1000 desktop home layout visually inspected and captured.
- Desktop archive search for Kesäkirja returned exactly one work.
- Theatre filtering returned exactly Hamlet and Isä.
- 820 × 1180 tablet member profile inspected; the document fits without horizontal overflow.
- Correlation matrix selection changed the displayed pair to Aino and Leena and its coefficient to 0.46.
- Geographic Atlas loaded 127 Natural Earth land paths and 17 country selectors. Selecting Finland displayed 12 associated demo works.
- 390 × 844 phone production-build import: an actual XLSX file with an initial title/empty row was selected through the file chooser. Detected three books, four reviewers and eleven scores, with correct date/title/creator columns.
- Original scale confirmation was required before continuing. The summary showed missing scores as missing.
- Saved the imported archive, opened it and reloaded it: all three works persisted.
- Imported Stoner detail showed original scores 9, 8, 9 and an absent fourth score. The phone layout fits without horizontal overflow.

Evidence screenshots were saved outside the source tree under `/private/tmp/atlas-proof/`.

## Verification limits

No dedicated Supabase project was provided or created; an unrelated existing project was left untouched. Live email delivery, real Supabase Auth sessions, hosted RLS advisors, Realtime between two physical devices and live cross-device synchronization remain unverified until setup. Browser-size checks do not prove actual iOS installation, safe-area behavior or VoiceOver behavior. Offline IndexedDB behavior and the generated service worker are verified separately; an actual device offline/standalone test remains necessary. Public catalog integrations are prepared with explicit user confirmation and graceful error handling; live responses vary by provider.

## GitHub Pages migration

The repository is `tdufva/kirjakerho`. The project build uses `/kirjakerho/` as its asset, manifest and service-worker base. Hash routes refresh without GitHub Pages rewrites. Three additional tests cover project-path links and invitation query parameters (36 tests total). Original 33 domain/import/authorization tests continue to pass. Supabase callbacks use PKCE so authentication does not occupy the routing fragment. Deployment is handled by the pinned Actions workflow in `.github/workflows/pages.yml`.

## Jazz Club design refresh

The six ColorArchive Jazz Club swatches are implemented as shared theme tokens. The new original 1920s-style illustration is served as local 1120 px and 640 px WebP assets and included in the PWA precache. Bodoni Moda fonts and license are bundled. Decorative stars were removed from all screen components and icons. Browser inspection verified no star glyphs in rendered home/archive content and no horizontal overflow at 1440 px and 390 px. The archive's original 38 demo works remained intact.

The 36 existing tests pass, TypeScript checks pass and the production build succeeds. A stale lazy-chunk failure observed while replacing a running preview build led to a one-time application-shell refresh handler; IndexedDB data is retained. The PWA update button was exercised successfully in the preview.

## Quiet literary imagery

Replaced the musician illustration with two new original, people-free images: an empty smoky salon and a quiet library reading corner. Sinuhe egyptiläinen appears as a visual reference on original generic book bindings. Hero, welcome and the home Atlas invitation use the new assets. The old people-containing WebP files were removed from published assets. TypeScript and the production build pass; all four responsive WebP variants are included in the PWA precache. Archive entries and ratings are unchanged.
