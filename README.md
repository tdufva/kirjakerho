# Kirjakerhon Atlas

A Finnish literary and cultural archive PWA for a private book club. React 19, strict TypeScript, Vite, Tailwind 4, React Router, SheetJS, IndexedDB, and Supabase. Fraunces and DM Sans are served locally.

## Run locally

Requires Node.js 22.12+ and pnpm 11.25.0.

```sh
cd atlas
pnpm install
pnpm dev
```

Open the URL printed by Vite. From this directory, omit `cd atlas`.

```sh
pnpm test
pnpm build
pnpm preview
```

`pnpm-workspace.yaml` permits only esbuild's required installation script. Dependencies are pinned and the lockfile is committed. SheetJS is the official 0.20.3 distribution, rather than the older npm `xlsx` release.

## Working features

- Finnish welcome flow, responsive top/bottom navigation, archive search, category/year/member/rating filters, sorting, grid/list views and work detail pages.
- Clearly marked fictional demo: four readers, 34 books, two plays and two exhibitions, 2017–2026. Ratings, reviews, reading dates and illustrative Atlas annotations are demo material, not real book club history. Cover designs are original typographic illustrations, not the books' original covers.
- A deterministic Excel/CSV/ODS importer with multiple sheets, merged cells, header detection, Finnish/Swedish/English labels, wide/long structures, reviewer columns, separate numerical and written reviews, original scales, corrections and preview.
- Duplicate matching, safe reimports, explicit change/conflict acknowledgement, original row provenance, full raw row retention in import history, JSON backup download, and a one-version recovery copy.
- Accurate means, population standard deviation, paired Pearson correlations, sample sizes, distributions, yearly activity and member comparisons. Zero is a real score; missing values are never zero. Correlations need at least three pairs and variation in both sets.
- Offline-capable geographic exploration using bundled public-domain Natural Earth land outlines; separate setting/author/publication place types, separate reading/publication/story time, themes and an interactive theme-to-work connection view.
- Manual, consent-driven metadata search in Finna, Open Library and Google Books. The title and creator are sent only when the user presses the search button. Results require confirmation; provenance, retrieval time and matching confidence are stored separately from imported data. The core archive works if a provider fails.
- PWA manifest, icons, iOS metadata, precached app shell/fonts/map, update prompt and user-scoped IndexedDB snapshots. Offline **reading** is supported; cloud writes require connectivity.
- Prepared Supabase authentication, clubs, roles, email-bound single-use invitations, atomic archive saving, optimistic revision checks, Realtime subscriptions, refresh on focus/reconnect and a polling fallback.

## Connect Supabase

Cloud access is **not configured in the delivered demo**. No credentials are invented, and no existing unrelated Supabase project is modified. Cross-device synchronization, passwordless login and invitations require this setup and live multi-device verification.

1. Create a dedicated Supabase project.
2. Apply the SQL in `supabase/migrations/20261029123223_initial_atlas.sql` using the Supabase SQL editor or your normal migration workflow. `supabase/schema.sql` is the same initial schema for reference; apply it only once, not in addition to the migration.
3. Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Use the project's **publishable** key, never a service-role or secret key. These two Vite variables are intentionally public configuration protected by database authorization. Changes require a rebuild.

4. Enable email sign-in in Supabase Auth. Configure the production Site URL and allowed redirect URLs (`http://127.0.0.1:5173/asetukset` for local development; `https://YOUR_DOMAIN/asetukset` for production). Configure a real SMTP provider before inviting members; development email limits are not a production mail service.
5. Restart Vite or rebuild the production app. Sign in from **Asetukset**, create a club and import its Excel archive. Send generated invitation links yourself. Invitations expire after seven days, can be used once, and require the recipient's verified email.
6. Sign in on a second device, accept an invitation, and verify that a subsequent administrator import appears there. Try an offline read after a successful sync and reconnect afterwards.
7. Review Supabase's security advisors on the deployed schema. Local tests exercise PostgreSQL RLS and RPCs, but do not replace a live Supabase deployment audit.

### Authorization model

`club_access` represents registered users and permissions. `members` represents historical reviewers; an old reviewer never needs an account. IDs are composite with club IDs, so two clubs can import the same historical member/work without colliding.

All exposed tables have RLS and only authenticated read grants. Clients cannot directly write archive tables or grant themselves membership. Privileged code lives in the unexposed `private` schema with an empty search path and explicit user/role checks. Public wrappers are security invokers. Imports are one transaction; invalid data or stale revisions roll back the entire save. Private invitation tokens are stored only as SHA-256 hashes.

Realtime publishes only the club's revision row. Readers refresh the complete authorized snapshot, avoiding partially synchronized imports. A scoped cache index permits reopening a previously synchronized archive offline while an authenticated local session remains. Signing out clears that user's cached club data on this device. Browser storage is local to that browser profile; use device security on shared devices.

## Import behavior and limits

Choose the original file without editing it. Detection scans up to 40 initial rows and proposes column roles. Numeric distribution helps identify reviewer columns while excluding years, pages, ISBNs and average/sum columns. Suggestions are heuristic: inspect the previews and correct uncertain columns. Each sheet can have a different header row and can be excluded.

Confirm the **minimum and maximum possible original score**; an observed range cannot establish a scoring scale. A workbook containing multiple scales should be imported in separate passes with only the sheets for one scale selected at a time. The importer does not guess mixed scales. Original scores and bounds remain intact.

Every comparable score uses `(value - minimum) / (maximum - minimum) * 10`. For example, 3 on a 1–5 scale becomes 5 comparison points. Detail pages also show the original score. An overall average is an average of all observed individual comparison scores; a work's average uses only its actual ratings.

Work identity uses normalized title, creator and cultural category, plus the event date for non-book experiences. Book discussion dates can change without generating another work. Identical title/creator editions and repeated book readings are merged; inspect conflicts if you need separate editions. The first conflicting evaluation **within one workbook** is retained and flagged. On a subsequent import, supplied ratings update old values after confirmation; missing cells preserve existing ratings. Imported authors and publication values are never overwritten by uncertain external matches.

Unrecognized fields become original notes. Rows that lack titles or have unreadable values are flagged; all raw sheet rows, mappings and warnings are retained in the import record, downloadable from settings. Written comments without numerical scores remain separate written reviews. Formatting, formulas and macros are not executed. Original binary Excel files are not retained: keep your originals. Files are capped at 20 MB and parsing currently runs on the browser's main thread, so very large workbooks may pause briefly.

Rollback restores the last locally cached version; it is not a complete server-side version history. Download backups before major changes. JSON backups are for preservation/inspection; the UI currently restores its last cached version, not arbitrary uploaded JSON files.

## Atlas and metadata

Imported locations are retained as original notes until their meaning has been verified. Author nationality and setting are never inferred from one another. Missing story periods are not filled from publication dates. Generic metadata subjects are retained with their source; they are not silently promoted to verified themes or story settings. Consequently a new import may have sparse Atlas views until verified annotations are added. Administrators can add verified themes, story periods and setting/author/publication countries from a work's **Täydennä Atlasta** dialog, with a source note. Map points are country-level centroids, not inferred city locations.

The map uses a simple equirectangular projection and country selection, not a street map. Zoom is centered; country buttons provide a touch/keyboard alternative. The connection view is a readable theme-to-work network. It does not claim unverified cultural connections. AI interpretation, conversational search, recommendations, the food atlas and yearbook/PDF export are future interfaces, not working features. No AI requests are made.

Source documentation: [Supabase email login](https://supabase.com/docs/reference/javascript/auth-signinwithotp), [Realtime](https://supabase.com/docs/guides/realtime/postgres-changes), [Finna API](https://www.kiwi.fi/spaces/Finna/pages/53839221/Finna%2BAPI%2Bin%2BEnglish), [Open Library search](https://openlibrary.org/dev/docs/api/search), [Google Books](https://developers.google.com/books/docs/v1/using). Each provider controls its own availability, cover rights and quotas. Confirmed metadata is cached with the work; external covers require their provider to remain reachable and are not precached.

## Deploy

This is a static application. Build with `pnpm build` and serve `dist/` over HTTPS. Configure every application route to fall back to `index.html`; `_redirects` is included for compatible hosts. Do not cache `index.html` or `sw.js` indefinitely. HTTPS (or localhost) is required for installation, Web Crypto and the service worker.

`.openai/hosting.json` declares a private Sites deployment. Vite configuration is compiled into static assets; set cloud environment variables before building. An owner-private preview allows the owner to inspect the app; access for all four club members additionally requires a suitable hosting audience/domain and Supabase memberships. Hosting access and book club membership are separate controls.

Low-cost alternatives include Cloudflare Pages and Netlify. Keep all service secrets server-side if adding a provider that needs credentials. This release's public catalog queries need no secret API keys.

### Verify installation and updates

- In production, confirm `/manifest.webmanifest`, `/sw.js` and both PNG icons return successfully.
- Open the app once online, navigate through the archive, then test an offline reload. Auth and metadata requests remain network-only; private API responses are never cached in the service worker.
- On iPhone/iPad, open in Safari → Share → Add to Home Screen. Test on an actual device; browser viewport checks do not prove iOS standalone installation.
- Publish a changed version and accept the update prompt to refresh the shell.

## Structure

```text
src/components/  Finnish screens and accessible reusable UI
src/domain/      Types, deterministic identities and statistics
src/importer/    Workbook reading, interpretation and reimport merging
src/services/    Scoped caching, cloud/auth, metadata and future AI interface
src/data/        Clearly identified fictional demo
src/locales/     Central vocabulary; additional locales can be introduced here
supabase/        Initial migration and PostgreSQL authorization tests
public/          Local fonts, licenses, icons and map outlines
```

Navigation vocabulary is centralized, but full translation catalog extraction remains future work. The interface is Finnish throughout.

## Validation

`pnpm test` runs importer, normalization, reimport, statistical edge-case, offline-cache and PostgreSQL authorization/transaction tests. PGlite runs the real schema against PostgreSQL with a small simulated Supabase Auth schema. It tests nonmember isolation, direct-write rejection, email-bound one-use invitations, read-only access, atomic rollback and concurrent revision rejection. Live Supabase Auth/email/Realtime and actual iOS installation require configured external services/devices.

## Licenses

Fraunces and DM Sans: SIL Open Font License (included under `public/fonts/licenses`). Natural Earth: public-domain map data from [naturalearthdata.com](https://www.naturalearthdata.com/about/terms-of-use/), geometry from its official [vector repository](https://github.com/nvkelso/natural-earth-vector). Lucide: ISC. SheetJS: Apache-2.0. Book titles/author names identify real published works; demo commentary and cover illustrations were created for this application.
