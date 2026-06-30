# Obsidian Astro Publisher

This repository contains the public Astro notes site and the Obsidian plugin source for publishing selected notes through GitHub Pages.

## Public Content Contract

Published notes live at `content/notes/:slug.md`.

Published assets live at `public/assets/notes/:slug/:filename`.

Required frontmatter:

```yaml
title: "How I Read Books"
slug: "how-i-read-books"
source_id: "obsidian-uuid-value"
publish: true
created_at: "2026-06-30"
updated_at: "2026-06-30"
```

`source_id` identifies the original local note without revealing the vault path.

## Development

Run `npm install` at the repository root.

Run `npm run dev` to start the Astro site.

Run `npm run verify` before committing implementation changes.
