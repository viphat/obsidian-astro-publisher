# Leafy redesign of the Astro site

**Date:** 2026-07-04
**Status:** Approved
**Scope:** Astro site only (repo root). No plugin changes, no publishing-contract changes.

## Goal

Redesign the public site's UI to match the look and feel of https://duongdao.family/ — a warm
"leafy" design with a soft green paper background, white rounded cards, forest-green accents,
pill-shaped controls, a sticky blurred header, and a hero-card homepage — while keeping the
site's current identity ("Dương Đào Notes" wordmark, English UI text) and its zero-dependency
plain-CSS architecture.

## Decisions made during brainstorming

- **Homepage:** full reference structure (hero card + featured note + tag sidebar + recent list).
- **Dark mode:** dropped. Light-only, matching the reference.
- **Branding:** keep "Dương Đào Notes" + 笔记 mark and English UI text; adopt the reference's
  visual presentation (circular avatar badge, greeting hero, pills).
- **Implementation:** plain CSS custom properties + scoped Astro styles. No Tailwind, no new
  runtime dependencies.
- **Reading time:** add a small tested `readingTime` helper ("X min read") shown in note meta,
  mirroring the reference's "X phút đọc".

## Reference design facts (extracted from duongdao.family)

Palette (Tailwind theme of the reference, adopted verbatim):

| Token | Value | Role |
|-------|-------|------|
| paper | `#f5f8f1` | page background (green-tinted off-white) |
| card  | `#ffffff` | card surfaces |
| ink   | `#2b3a2a` | headings/body text (dark green-gray) |
| muted | `#64735f` | secondary text |
| line  | `#dde7d4` | hairlines/borders |
| leaf  | `#35714a` | primary accent (links, buttons, pills) |
| pine  | `#29583b` | accent hover |
| moss  | `#e9f1e0` | soft accent wash (pill/blockquote/table-head bg) |
| cream | `#f8f4e7` | warm gradient partner |
| berry | `#b04a4a` | error/inline-code accent (`#9c4a3c` for inline code text) |

Other visual facts: cards use 24px radius (hero/prose card 28px, images 16px, pills 999px);
shadows `lift: 0 16px 44px rgba(53,113,74,.10)` and `leafy: 0 8px 26px rgba(53,113,74,.12)`;
fonts Lora (display), Be Vietnam Pro (body), JetBrains Mono (code); content max width 72rem
(homepage grid) / 48rem (article column); prose line-height 1.9; blockquotes in moss with a
leaf left border and `0 16px 16px 0` radius; code blocks on dark forest `#26382b`; `hr`
renders as a centered ❦ ornament; sticky header with `backdrop-blur` over translucent paper.

## Changes by file

### `src/styles/global.css` — theme tokens + prose

- Replace the "ink & paper" palette with the leafy palette above. Remove the
  `prefers-color-scheme: dark` block entirely.
- Keep the existing font stacks (Lora / Be Vietnam Pro, with CJK fallbacks) and add
  "JetBrains Mono" at the front of `--font-mono`.
- New tokens: `--radius-card: 24px`, `--radius-hero: 28px`, `--radius-img: 16px`,
  `--shadow-lift`, `--shadow-leafy`.
- Shell widths: `--shell-wide: 72rem` (header/footer/homepage), `--shell-note: 48rem`.
- Restyle `.note-body` prose to match `.content-prose` on the reference: leaf links
  (weight 600), moss blockquote with rounded right corners, dark-forest `pre` blocks,
  inline code on moss with `#9c4a3c` text, moss table headers with full cell borders,
  16px-rounded images, ❦ `hr`, `line-height: 1.9`.
- Keep per-language (`:lang(zh/ja)`) reading refinements, `::selection`, focus styles,
  skip link, and reduced-motion block (retinted to the new palette).

### `src/layouts/BaseLayout.astro` — shell

- Sticky header (`position: sticky; top: 0`), translucent paper background with
  `backdrop-filter: blur`, bottom `line` hairline. Contents (max 72rem, centered):
  - Circular avatar badge: moss background, `line` ring, "Đ" monogram in Lora
    (no image asset).
  - Wordmark: "Dương Đào Notes" + small 笔记 mark, with a one-line muted subtitle
    (current tagline, shortened) visible on `md+`.
  - Pill nav links: **Home** (`/`), **Tags** (`/tags/`), reference `.nav-link` treatment
    (rounded-full, moss hover). No mobile hamburger — two links fit on small screens.
- Footer: centered, reference-style — site name in Lora, muted tagline, © year +
  "Written in Obsidian, published to the open web."
- `theme-color` meta becomes `#f5f8f1` (single value; dark variant removed).
- Google Fonts link adds JetBrains Mono.
- Keep `variant` prop: `list` → wide shell, `note` → narrow shell. The masthead tagline
  paragraph moves into the homepage hero, so the header is identical across pages.

### `src/pages/index.astro` — homepage (reference structure)

Top-to-bottom, in a 72rem shell:

1. **Hero card** — 28px radius, `line` border, `lift` shadow, moss→card→cream gradient
   with two blurred color blobs and 2–3 subtle inline leaf SVGs (`aria-hidden`,
   `pointer-events: none`). Left column: small uppercase leaf-colored kicker
   ("Dương Đào Notes"), Lora greeting heading — exact text: "Hello, thanks for
   stopping by 🌿" — then the existing tagline ("A public notebook — kept in the
   open, in whatever language the thought arrived in."), two pill CTAs — solid leaf "Read the
   latest note" (→ newest note) and outlined "Browse tags" (→ `/tags/`). Right column
   (hidden on small screens): large circular avatar badge with moss ring + site name.
2. **Featured + sidebar grid** (`1fr / 300px` on `lg+`, stacked below):
   - **Featured note card**: the newest note — moss tag pill (first tag, when present),
     Lora title (2xl–3xl), date + read-time meta, description, leaf "Read note →" row.
     Whole card is a link with hover lift. When there are no notes, show the existing
     empty-state message inside a card instead.
   - **Tag sidebar card**: "Tags" kicker + all tags as pill links (`getTagGroups`),
     each pill showing the tag label; moss hover. Omit the card when there are no tags.
3. **Recent notes** — "Recent notes" Lora heading, then the remaining notes (newest
   first, excluding the featured one) as restyled `NoteCard`s. Omit the section when
   there is only the featured note.

### `src/components/NoteCard.astro` — card restyle

White card, 24px radius, `line` border, `leafy` shadow, hover: `-2px` translate +
`lift` shadow (transition; no-op under reduced motion). Contents: meta row (date ·
read time), Lora title with leaf hover, muted description, tag pills. The whole card
links to the note; tag pills remain separate links (nested-interactive kept out of the
main link, as today). New optional prop: `readMinutes`.

### `src/layouts/NoteLayout.astro` + `src/components/NoteMeta.astro` — note page

- Article column (48rem): "← All notes" leaf back link, tag pills (moss, uppercase,
  reference treatment), Lora `h1` (4xl–5xl scale), meta row: created date, "updated …"
  when different, "X min read".
- Cover image (when present): 16px radius, above the body card.
- Body: white card, 28px radius, `line` border, `leafy` shadow, generous padding
  (1.5rem mobile → 2.5rem desktop), containing `.note-body` prose.
- `NoteMeta` renders the meta row + tag pills; gains a `readMinutes` prop.

### `src/pages/tags/[tag].astro` + new `src/pages/tags/index.astro`

- `[tag].astro`: back link, "#tag" Lora heading with leaf-colored hash, note count,
  then note cards (same `NoteCard`).
- **New** `tags/index.astro`: "Tags" heading + count, pill cloud of all tags (label +
  per-tag note count), each linking to its tag page. Uses `getPublicNotes` +
  `getTagGroups` only — no new data logic. This gives the header's "Tags" nav link a
  destination.
- Reserved-path note: `tags` is already a reserved top-level path; adding `/tags/`
  index changes nothing about the slug-collision invariant.

### `src/lib/readingTime.ts` — the one new logic module (TDD)

- `estimateReadingMinutes(markdown: string): number` — strips fenced code blocks,
  counts whitespace-separated words, `Math.max(1, Math.round(words / 200))`.
- Word-splitting on whitespace is the deliberate choice even though CJK doesn't use
  spaces — current content is Vietnamese/English and the value is a soft estimate.
- Tests in `tests/readingTime.test.ts`: empty string → 1; short text → 1; ~400 words
  → 2; fenced code excluded; frontmatter not passed in (callers pass `note.body`).
- Wired up in `index.astro`, `[slug].astro`/`NoteLayout`, and tag pages via
  `note.body`.

## Explicitly out of scope

- Plugin (`plugin/`) — untouched.
- Categories/archives pages, comments, view counters, search (reference features not
  in this site's data model).
- Post images/thumbnails on cards (notes rarely have covers; featured card is
  text-only).
- Dark mode.

## Error handling / edge cases

- 0 notes: hero renders (CTA "Read the latest note" hidden), empty-state card shown,
  sidebar/recent sections omitted.
- 1 note: featured card only; "Recent notes" section omitted.
- Notes without tags: featured card omits the pill; tag sidebar/tags index show only
  existing tags (both already derive from `getTagGroups`).
- Long titles/descriptions: cards rely on natural wrapping (`text-wrap: balance` on
  titles); no truncation logic.

## Testing & verification

- New unit tests: `tests/readingTime.test.ts` (TDD — written before the helper).
- Existing tests (`tests/*.test.ts`) cover lib logic and must stay green; no route or
  data-contract changes are made.
- `astro check` guards the template/prop changes (new `readMinutes` props, tags index).
- Gate: `npm run verify` (site tests + astro build + plugin tests + plugin build)
  before commit.
- Visual verification via dev-server preview of `/`, a note page, `/tags/`, and a
  `/tags/[tag]` page at mobile and desktop widths.
