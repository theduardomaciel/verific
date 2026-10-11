# Self-hosting Google Fonts (deferred)

## Status and context

Event themes already support any catalog font: `packages/drizzle/theme.ts`
stores `{ family, weights, italic?, category }` per role (`heading`/`body`),
validated on save by `normalizeThemeFonts` (`packages/api/lib/theme-fonts.ts`)
against the static catalog (`packages/fonts/catalog.json`, served through
`getFont`/`fontSelectionSchema`). Public event pages render fonts through a
single choke point, `getFontDelivery` (`apps/web/lib/theme/font-delivery.ts`),
consumed by `apps/web/app/(event)/[eventUrl]/layout.tsx`. Today that function
emits a Google Fonts `css2` stylesheet (built by `buildFontStylesheetUrl`,
always `display=swap`) plus preconnects, only when a role uses a non-preset
family; preset families stay on `next/font` and load nothing extra. The editor
(`FontPicker`, `ThemePreview`) previews via Google CDN through
`ensureFullStylesheet` (`font-loading.ts`). Self-hosting was deferred to ship
the picker first; this note records the agreed design so Phase 5 can start
without re-discovery.

## Why do it (and when)

Serving font files from our own storage removes the only third-party runtime
dependency on public event pages, which helps privacy posture, makes pages
robust to Google CDN outages, and lets us set our own cache policy. It is not
urgent while traffic is small, so prioritize it when one of these triggers
fires:

- Privacy/compliance review (e.g. LGPD) flags requests to Google at page load.
- An event requires a strict Content-Security-Policy without Google hosts.
- We observe Google Fonts reliability or latency problems in our regions.
- Measurements show font loading hurting LCP/CLS on event pages.

## Proposed design

A server-side ingestion service downloads each selected family once and shares
the files across all events. It runs fire-and-forget after `updateProject`
saves a theme (never blocking the save), and is idempotent and safe under
concurrent saves via unique constraints on the registry table. Concretely:

- Validate family and weights against the catalog (`fontSelectionSchema`).
- Fetch the `css2` stylesheet from `fonts.googleapis.com` with a modern user
  agent so the response is woff2 split by `unicode-range` subsets.
- Keep `latin` and `latin-ext` by default (configurable; other subsets only
  if the font has no `latin`).
- Download the woff2 files from `fonts.gstatic.com` and upload them through
  the existing `storage` adapter (`packages/api/lib/storage.ts`).
- Store under `fonts/{family-slug}/{style}-{weight}-{subset}.woff2`
  (`slugifyFamily` already exists), public, with long-lived immutable cache
  headers like images.
- Generate `@font-face` CSS with `font-display: swap`, preserving
  `unicode-range`, pointing at our storage URLs.

## Data model

A `font_assets` registry table records what is already hosted, so ingestion
never re-downloads and we can report total usage. One row per hosted file:

- `family`, `weight`, `style`, `subset`
- `key` (storage key, unique), `bytes` (file size)
- `createdAt`

Total storage used is `SUM(bytes)` over the table; expose it via a script or
an admin-only query, not through any public route.

## Delivery switch

Only `getFontDelivery` changes; its callers in `layout.tsx` stay the same.
When a theme's fonts are fully ingested, it returns an inline `<style>` with
the generated `@font-face` rules (or a link to a generated CSS file in
storage) plus `<link rel="preload" as="font" type="font/woff2" crossorigin>`
for the primary font's `latin` file, dropping the Google preconnects and
stylesheet. When ingestion is missing, incomplete, or failed, it keeps
returning the current Google CDN delivery so the page never breaks. Event
pages are statically cached (`getProject` in `apps/web/lib/data.ts` uses
`"use cache"` with `project:${eventUrl}` tags), so revalidate through the
existing `revalidateProjectTheme` (`apps/web/lib/theme/actions.ts`) both when
the theme is saved and when ingestion completes. The editor keeps using Google
CDN for previews and surfaces ingestion failure as a non-blocking indicator.

## Security and limits

Ingestion fetches remote files, so it must be narrowly confined: allowlist
exactly `fonts.googleapis.com` and `fonts.gstatic.com`, never fetch
user-controlled URLs, and never interpolate the raw family name into a URL or
storage key (validate against the catalog, then use `slugifyFamily` plus
numeric weight/style/subset from the parsed response). Enforce:

- Per-file size cap and total-files-per-family cap.
- Fetch/upload timeouts and a small retry budget.
- Same-origin checks on redirects (stay on the allowlisted hosts).

## Storage estimate

A latin woff2 file is roughly 15–30 KB per weight (the picker heuristic in
`estimateFontPayload` uses ~18 KB); a typical selection of 2–3 weights across
`latin` + `latin-ext` lands around 100–200 KB per font. Storage is bounded by
the number of _distinct_ fonts organizers actually pick, not by the number of
events, since files are shared. Once implemented, compare real usage with
`SUM(bytes)` on `font_assets` against these estimates.

## Testing plan and acceptance criteria

Cover the risky seams with unit tests before wiring ingestion into the save
path: parsing of `css2` responses into (style, weight, subset, URL,
unicode-range) tuples; idempotent re-ingestion of the same family; rejection
of off-allowlist hosts and user-controlled URLs; deterministic key generation
including diacritics and multi-word families; delivery fallback whenever any
required file is missing; and `getFontDelivery` output in both modes
(self-hosted style/preload vs Google stylesheet). Acceptance: preset-only
themes emit nothing extra; custom themes render identically with zero Google
requests once ingested; a failed ingestion still renders via CDN.

## Open questions and optional extras

Google Fonts are published under open licenses (OFL/Apache) that permit
self-hosting; keep the per-font `license` field from the catalog alongside
hosted files if feasible, and surface it in the picker later. Optionally, add
size-adjusted fallback `@font-face` rules from each font's metrics to cut
layout shift further — only if it stays cheap. Decide a cleanup policy for
fonts no event references anymore (likely: keep forever while storage is
small, revisit past a threshold). Unresolved: whether the generated CSS lives
inline per page or as one shared file per family in storage.
