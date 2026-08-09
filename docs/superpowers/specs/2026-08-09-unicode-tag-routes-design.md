# Unicode-aware tag routes

**Date:** 2026-08-09  
**Status:** Approved design; pending implementation-plan review  
**Scope:** Astro site tag routing and grouping only. The Obsidian plugin and published frontmatter contract remain unchanged.

## Goal

Allow tags written with Chinese characters, and other Unicode letters or numbers, to appear in tag lists and resolve to human-readable tag routes.

| Authored tag | Route |
|---|---|
| `中文` | `/tags/中文` |
| `学习笔记` | `/tags/学习笔记` |
| `Tiếng Việt` | `/tags/tieng-viet` |
| `中文 / 学习` | `/tags/中文-学习` |

Browsers may percent-encode the Unicode portion during navigation; that is the same route and is expected URL behavior.

## Design

`src/lib/slug.ts` remains the single source of truth for tag-route generation. `slugifyTag` will retain Unicode letters and Unicode decimal digits, convert whitespace and punctuation runs to one hyphen, and keep its existing Latin normalization:

- Normalize to NFD and remove combining diacritics.
- Lowercase where the writing system has case.
- Convert Vietnamese `đ` to `d`.
- Preserve characters matched by Unicode letter and number properties.
- Trim and collapse hyphens.

`getTagPath` will continue to derive links exclusively from `slugifyTag`. `getTagGroups` will continue to derive static route parameters from the same slug and will no longer discard Chinese-only tags because their slug is no longer empty.

No change is made to note slugs. The ASCII-only note-slug invariant shared by the site and plugin remains in force.

## Edge cases

- A tag containing only punctuation/emoji remains invalid for routing and is omitted from tag groups, as today.
- Existing ASCII and Vietnamese tag URLs remain unchanged.
- Tags that normalize to the same slug continue to share a group; the first tag seen provides the displayed label, as today.
- Chinese tag text remains the displayed label on note pages and cards; its link now resolves to its matching tag archive rather than `/tags/`.

## Testing and verification

Add root-site unit tests before changing production code. They will prove that Chinese-only tags produce non-empty readable slugs and groups, mixed Chinese and Latin tags normalize punctuation correctly, and Vietnamese behavior stays unchanged. Run the focused root tests, then `npm run verify` before committing the implementation.

## Out of scope

- Transliteration, pinyin generation, or ASCII aliases for Unicode tags.
- Changes to plugin tag normalization, publishing, or note slug validation.
- Tag taxonomy, search, or migration of existing content.
