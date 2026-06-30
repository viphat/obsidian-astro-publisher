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

## GitHub Pages Deployment

In the GitHub repository settings, set Pages source to GitHub Actions.

The workflow at `.github/workflows/deploy.yml` builds Astro and deploys the `dist` artifact.

For the custom domain, configure `notes.duongdao.family`, add the matching DNS record, wait for verification, then enable HTTPS enforcement.

## Manual Obsidian Plugin Installation

Build the plugin:

```sh
npm run plugin:build
```

Copy these files into an Obsidian vault under `.obsidian/plugins/astro-publisher/`:

- `plugin/manifest.json`
- `plugin/main.js`

Enable "Astro Publisher" in Obsidian community plugins.

## GitHub Token

Use a fine-grained GitHub personal access token restricted to the publishing repository.

Grant repository contents read/write permission only.

Do not use a token with access to unrelated private repositories.

The token is stored in Obsidian plugin settings for this personal MVP.

## Release Verification

Run:

```sh
npm run verify
```

Expected result:

- Site tests pass.
- Astro check and build pass.
- Plugin tests pass.
- Plugin bundle builds.
