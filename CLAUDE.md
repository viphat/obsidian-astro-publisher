# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Two subsystems, two npm projects

This repo is **one public Astro site (repo root)** plus **one Obsidian plugin (`plugin/`)**. They are separate npm packages with separate `node_modules`, `package-lock.json`, `tsconfig.json`, and Vitest setups. The root builds the site; `plugin/` builds the plugin bundle.

- **Astro site (root):** renders normalized public Markdown from `content/notes/:slug.md` (+ assets in `public/assets/notes/:slug/:filename`). It **never reads the Obsidian vault** — it only consumes already-normalized public files.
- **Obsidian plugin (`plugin/`):** reads the private vault, transforms a note to public Markdown, and uploads it to the publishing repo via the **GitHub Contents API**. It owns validation, slug/identity, Markdown transform, asset discovery, the confirm manifest, and unpublish.

Data flows one way: vault → plugin → GitHub repo (`content/notes/`, `public/assets/notes/`) → Astro build → GitHub Pages. Nothing flows back.

## Commands

```sh
npm install                 # root deps
npm install --prefix plugin # plugin deps (separate project)

npm run dev                 # Astro dev server
npm run build               # astro check && astro build (root)
npm run test                # root/site Vitest (tests/*.test.ts)
npm run plugin:test         # plugin Vitest (plugin/src/__tests__/*.test.ts)
npm run plugin:build        # esbuild -> plugin/main.js
npm run verify              # test + build + plugin:test + plugin:build (run before committing)
```

Run a single test (Vitest name filter):
```sh
npx vitest run --config vitest.config.ts -t "sorts notes newest first"   # site (from repo root)
cd plugin && npx vitest run -t "parses tags"                              # plugin (from plugin/)
```

`npm run verify` is the gate: site tests, `astro check`+build, plugin tests, plugin bundle. It must be green before any commit.

## Development workflow

This project is built with the **superpowers** skill set and TDD is expected: write the failing test first, then the implementation. Implementation plans live in `docs/superpowers/plans/`.

## Invariants that span multiple files (get these wrong and it breaks silently)

- **The slug regex is duplicated and must stay byte-identical:** `SAFE_SLUG_PATTERN` in `src/lib/slug.ts` (site) and `VALID_SLUG` in `plugin/src/core/slug.ts` (plugin). Both are `^[a-z0-9]+(?:-[a-z0-9]+)*$`. The plugin hard-rejects invalid slugs at publish; the site throws at build. If they diverge, the plugin can publish a slug the site refuses to build.
- **`source_id` is a deterministic hash of the note path** (`plugin/src/core/identity.ts`, cyrb53), not a random UUID. This keeps identity stable across re-publishes even when it is never written back locally, while still tripping the cross-note slug-collision guard. Never make it random.
- **YAML dates parse to `Date` objects.** gray-matter/js-yaml turn unquoted `created_at: 2026-01-01` into a `Date`, not a string. Use `coerceDateString` (frontmatter.ts) for any date field. `today()` must use local calendar fields (`plugin/src/core/dates.ts`), never `toISOString()` (that's UTC and mis-stamps by a day).
- **Public frontmatter is an allowlist, on purpose.** `normalizeFrontmatter` emits only known fields; author-added keys are intentionally dropped so nothing private leaks into the public repo. Don't "helpfully" pass unknown fields through.
- **Site routes must filter with `getPublicNotes`** (`publish !== false && draft !== true`) — `index`, `notes/[slug]`, `tags/[tag]` all rely on it. **Tags must go through `slugifyTag`/`getTagPath`/`getTagGroups`** — raw tags in URLs break the static tag route.
- **Publish uploads assets before the Markdown** (so a missing asset fails before the note exists). This is non-atomic: a mid-publish failure can orphan assets. Known/accepted gap — a real fix needs the Git Trees API (single commit).
- **`GitHubContentsClient.getFile` fetches raw via `download_url` for files >1MB**, because the Contents API omits the body then; the `source_id` ownership check depends on real content.
- **Markdown transform** (`plugin/src/core/markdown.ts`): masks fenced/inline code before rewriting (null-char sentinels), renders `![[Note]]` transclusions as note links (never aborts), resolves `#heading` anchors, matches wiki links case-insensitively, URL-encodes asset filenames, and rejects `..`/absolute asset paths.

## Plugin testability

`plugin/src/obsidianAdapter.ts` imports `obsidian` and **cannot be unit-tested** in Vitest. All real logic lives in pure `plugin/src/core/*` modules and `publisher.ts` (which takes injected `github`/`adapter` interfaces); the adapter is a thin delegator. Put new logic in `core/` with tests, and keep the adapter a pass-through.

## Public content contract

Published notes: `content/notes/:slug.md`. Assets: `public/assets/notes/:slug/:filename`. Required frontmatter: `title`, `slug`, `source_id`, `publish`, `created_at`, `updated_at`. Batch publish (`publish-all-marked-notes`) auto-approves the per-note manifest by design; single-note publish routes confirmation through `PublishManifestModal`.
