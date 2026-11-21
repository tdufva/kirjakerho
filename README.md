# Kirjakerhon Atlas

A dark, impressionist Finnish book and culture club archive.

**Published app:** https://tdufva.github.io/kirjakerho/

## Published Numbers edition

The application opens the owner's actual **Kulttuurikerho.numbers** data directly. It has no file upload, onboarding demo, login or per-browser import workflow. The published JSON is part of the application and its offline cache. Old IndexedDB archives are left untouched and do not replace this edition.

- All meeting numbers **1–252**, once each, from **1994-10-07 to 2024-09-14**.
- **207 book records**, **45 other culture meetings**, **996 individual ratings**.
- Reviewers: T = Tiina, H = Hilkka, E = Erkki, J = Jouko. Original **4–10** scale throughout. Group scores are arithmetic means; source sums remain available.
- **57,748 recorded pages** across 206 records. *Sotakummilapsi* is a verified book with a blank source page count; no pages are imputed.
- Three unscored meetings remain unscored (113, 161, 201). Two source dates contain only a year (91 and 99).
- Twenty copied ranking rows are excluded. The source switches back to history after the 2019 and 2024 section labels; these later meetings must not be dropped.
- Book identification repairs source spelling and the reversed title/author cells for meeting 228. Original title/author cells (one home street number redacted from the Canasta event), source row, meeting number, date, pages, total and individual score sources remain available.
- 204 Finna matches plus two Open Library matches are shipped with source links. Six sparse subject descriptions are supplemented from identified sources in `scripts/club-supplements.json`.
- Tero Ansio's *Ranskalaisen talon poika* is included in full. The owner confirmed its name and author on 2026-11-21 and said it may be self-published. Bibliographic metadata, themes and geography remain unverified.

Catalogue subject countries, verified story settings and publication places are distinct. Publication years refer to the selected library edition, which may differ from the edition read by the club. Missing places and historical periods are not invented. Map points are country centroids.

The public JSON contains first names, meeting dates and literary ratings. Original Numbers and Excel binaries and raw API caches are not committed.

## Run and verify

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
VITE_BASE_PATH=/kirjakerho/ pnpm build
```

For the optional private source comparison:

```sh
ATLAS_SOURCE_NUMBERS='/absolute/path/Kulttuurikerho.numbers' \
ATLAS_SOURCE_XLSX='/absolute/path/Kulttuurikerho.xlsx' pnpm test
```

`src/data/club.test.ts` checks complete meeting/rating coverage, missing scores, source sums, exact source dates, known edge cases, researched metadata and year-filtered analyses. With the original Numbers path it also compares every published source cell. The older importer/cache/PostgreSQL tests remain as regression coverage for retained library modules; those modules are not a visitor upload or cloud workflow in this edition.

To rebuild the public data, use the installed esbuild binary and source file:

```sh
mkdir -p tmp
node_modules/.pnpm/node_modules/esbuild/bin/esbuild scripts/build-club.ts \
  --bundle --platform=node --packages=external --format=esm --outfile=tmp/build-club.mjs
node tmp/build-club.mjs '/absolute/path/Kulttuurikerho.numbers' --enrich
```

The builder validates meeting coverage, all 996 scores, 4–10 endpoints and recorded page totals before writing `src/data/club.json`. It uses UTC calendar dates, retains year-only values, caches API responses in ignored `tmp/club-public/finna/`, and uses reviewed matching overrides and supplements from `scripts/`. Review its unresolved report and data diff before publication. Rebuilding does not edit the source workbook.

## Atlas previews

Map markers and country chips, reading years and edition decades, themes, and connection nodes open an in-place book preview. It includes a short sourced description, meeting/date/pages, the group average, all four original ratings and a link to the full work page. Multi-book selections are scrollable, with a local search for larger groups. Missing ratings remain missing. The preview supports Escape, outside-click dismissal, native focus trapping/return and a bottom sheet layout on phones.

## Analyses, sharing and yearbook

**Oivallukset** offers all-history and annual views: recorded pages, shared favourites, largest population standard deviation, closest reviewer pair by mean absolute difference, reviewer means, page-count/score correlation, repeat-author averages (at least three books), and subject averages (at least five books). Results identify their samples and methods. No written reviews or reader personalities are invented from numerical scores.

Each card has a stable share URL with its year/subject and a locally rendered PNG preview/download. Sharing uses native Web Share when available, otherwise clipboard or a selectable link. PNG height expands to fit long findings. No scores are sent to an image service.

The browser-generated **yearbook PDF** includes all dated meetings in the selected year, original ratings and any real written comments, favourites and disagreements. Local fonts, painted textures and salon artwork are embedded. PDF code is loaded only when needed.

## Deployment and installation

GitHub repository: **tdufva/kirjakerho**. `.github/workflows/pages.yml` tests and builds pushes to `main`, then deploys GitHub Pages. The production base path is `/kirjakerho/` and routes use hashes. Existing installed copies offer **Päivitä sovellus** when a new service worker is ready.

The PWA has a dark standalone shell, manifest, 192/512 icons, maskable icon, Apple touch icon and offline application/data cache. iPhone/iPad: Safari → Share → Add to Home Screen. Android/desktop: browser install action. External library links and covers need network access. Real iOS installation requires a physical-device check.

The visual identity follows the ColorArchive Jazz Club palette, local Bodoni Moda and DM Sans fonts, thick irregular painted strokes, empty smoky salons and Sinuhe imagery. There are no decorative stars or people.
