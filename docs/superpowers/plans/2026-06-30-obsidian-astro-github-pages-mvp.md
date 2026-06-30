# Obsidian Astro GitHub Pages MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Version 1 publisher: an Astro static notes site at the repository root plus an Obsidian plugin in `plugin/` that publishes selected notes and assets through the GitHub Contents API.

**Architecture:** The repository root is the public publishing site, so published content lands at `content/notes/:slug.md` and `public/assets/notes/:slug/:filename`. The Obsidian plugin is isolated under `plugin/` and owns note validation, Markdown transformation, asset discovery, publish manifest confirmation, GitHub uploads, and unpublish commands. Site code never reads the private vault; it only renders normalized public Markdown.

**Tech Stack:** TypeScript, Astro, Astro content collections with `glob()`, GitHub Actions Pages deployment, Obsidian Plugin API, GitHub REST Contents API, esbuild, Vitest.

---

## Scope Note

The spec spans two testable subsystems: the Astro site and the Obsidian plugin. This single MVP plan keeps them in separate tasks so the site can build from manual Markdown before the plugin exists, and the plugin core can be tested without launching Obsidian.

## File Structure Map

- Create: `package.json` - root scripts for Astro site, root tests, plugin delegation, and full verification.
- Create: `tsconfig.json` - root TypeScript config for Astro and tests.
- Create: `astro.config.mjs` - Astro config with `site: "https://notes.duongdao.family"`.
- Create: `vitest.config.ts` - root Vitest config for site library tests.
- Create: `.gitignore` - Node, Astro, plugin build, and local Obsidian artifacts.
- Create: `src/content/config.ts` - Astro content collection schema for root `content/notes`.
- Create: `src/lib/notes.ts` - site note loading, filtering, sorting, tag helpers.
- Create: `src/lib/slug.ts` - URL-safe path helpers for site routes.
- Create: `src/lib/seo.ts` - SEO metadata derivation.
- Create: `src/components/Seo.astro` - note and index metadata tags.
- Create: `src/components/NoteCard.astro` - homepage and tag page summary item.
- Create: `src/components/NoteMeta.astro` - date and tag metadata row.
- Create: `src/layouts/NoteLayout.astro` - readable note page layout.
- Create: `src/pages/index.astro` - homepage with recent notes.
- Create: `src/pages/notes/[slug].astro` - static note route.
- Create: `src/pages/tags/[tag].astro` - static tag route.
- Create: `content/notes/example-note.md` - normalized sample note.
- Create: `public/assets/notes/example-note/cover.svg` - deterministic sample asset.
- Create: `public/CNAME` - GitHub Pages custom domain.
- Create: `.github/workflows/deploy.yml` - Pages deployment workflow.
- Create: `plugin/package.json` - plugin build and test package.
- Create: `plugin/tsconfig.json` - plugin TypeScript config.
- Create: `plugin/esbuild.config.mjs` - bundles `plugin/src/main.ts` to `plugin/main.js`.
- Create: `plugin/manifest.json` - manual Obsidian install manifest.
- Create: `plugin/src/main.ts` - Obsidian plugin entry and command registration.
- Create: `plugin/src/settings.ts` - settings type, defaults, and settings tab.
- Create: `plugin/src/core/frontmatter.ts` - parse, normalize, and serialize public frontmatter.
- Create: `plugin/src/core/slug.ts` - slug generation and validation.
- Create: `plugin/src/core/markdown.ts` - wiki link and embed transformation.
- Create: `plugin/src/core/assets.ts` - embedded asset discovery and collision validation.
- Create: `plugin/src/core/manifest.ts` - publish manifest data structure and text.
- Create: `plugin/src/github/contentsClient.ts` - GitHub Contents API wrapper.
- Create: `plugin/src/publisher.ts` - publish, update, unpublish orchestration.
- Create: `plugin/src/obsidianAdapter.ts` - small adapter around Obsidian vault/workspace APIs.
- Create: `plugin/src/ui/PublishManifestModal.ts` - confirmation modal.
- Create: `plugin/src/ui/messages.ts` - user-facing message formatting.
- Create: `README.md` - setup, manual publishing contract, plugin install, and token guidance.

---

### Task 1: Repository Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `astro.config.mjs`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Create the root package manifest**

Create `package.json`:

```json
{
  "name": "obsidian-notes-publish",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "test": "vitest run --config vitest.config.ts",
    "plugin:build": "npm --prefix plugin run build",
    "plugin:test": "npm --prefix plugin test",
    "verify": "npm run test && npm run build && npm run plugin:test && npm run plugin:build"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create root TypeScript and Vitest config**

Create `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests", ".astro/types.d.ts"],
  "exclude": ["dist", "plugin"]
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
```

- [ ] **Step 3: Create Astro config**

Create `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://notes.duongdao.family"
});
```

- [ ] **Step 4: Create ignore rules**

Create `.gitignore`:

```gitignore
node_modules/
dist/
.astro/
.DS_Store

plugin/node_modules/
plugin/main.js
plugin/styles.css
plugin/data.json
plugin/.obsidian/
```

- [ ] **Step 5: Create initial README**

Create `README.md`:

```md
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
```

- [ ] **Step 6: Install root dependencies**

Run: `npm install`

Expected: command exits `0` and creates `package-lock.json`.

- [ ] **Step 7: Verify scaffold scripts are wired**

Run: `npm run test`

Expected: exits `1` with a message that no test files were found, or exits `0` if the installed Vitest version treats an empty suite as passing. Continue only if the command resolves to Vitest rather than a missing binary.

- [ ] **Step 8: Commit scaffold**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts astro.config.mjs .gitignore README.md
git commit -m "chore: scaffold publishing workspace"
```

---

### Task 2: Astro Content Contract

**Files:**
- Create: `src/content/config.ts`
- Create: `src/lib/slug.ts`
- Create: `src/lib/notes.ts`
- Create: `tests/site-notes.test.ts`
- Create: `content/notes/example-note.md`
- Create: `public/assets/notes/example-note/cover.svg`

- [ ] **Step 1: Write failing site library tests**

Create `tests/site-notes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPublicPathForSlug, isSafeSlug } from "../src/lib/slug";
import { getUniqueSortedTags, sortNotesNewestFirst } from "../src/lib/notes";

describe("site slug helpers", () => {
  it("accepts lowercase hyphen slugs", () => {
    expect(isSafeSlug("how-i-read-books")).toBe(true);
  });

  it("rejects uppercase, spaces, and non-latin URL slugs for v1", () => {
    expect(isSafeSlug("How-I-Read-Books")).toBe(false);
    expect(isSafeSlug("how i read books")).toBe(false);
    expect(isSafeSlug("tôi-đọc-sách")).toBe(false);
  });

  it("builds the public note path", () => {
    expect(getPublicPathForSlug("how-i-read-books")).toBe("/notes/how-i-read-books");
  });
});

describe("site note helpers", () => {
  const notes = [
    { data: { title: "Old", updated_at: "2026-01-01", tags: ["writing"] } },
    { data: { title: "New", updated_at: "2026-06-30", tags: ["writing", "reading"] } }
  ];

  it("sorts notes newest first", () => {
    expect(sortNotesNewestFirst(notes).map((note) => note.data.title)).toEqual(["New", "Old"]);
  });

  it("returns unique sorted tags", () => {
    expect(getUniqueSortedTags(notes)).toEqual(["reading", "writing"]);
  });
});
```

- [ ] **Step 2: Run tests to verify missing implementation**

Run: `npm run test`

Expected: FAIL because `src/lib/slug.ts` and `src/lib/notes.ts` do not exist.

- [ ] **Step 3: Create site slug helpers**

Create `src/lib/slug.ts`:

```ts
const SAFE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSafeSlug(slug: string): boolean {
  return SAFE_SLUG_PATTERN.test(slug);
}

export function getPublicPathForSlug(slug: string): string {
  if (!isSafeSlug(slug)) {
    throw new Error(`Invalid note slug: ${slug}`);
  }

  return `/notes/${slug}`;
}
```

- [ ] **Step 4: Create site note helpers**

Create `src/lib/notes.ts`:

```ts
type NoteLike = {
  data: {
    title: string;
    updated_at: string;
    tags?: string[];
  };
};

export function sortNotesNewestFirst<TNote extends NoteLike>(notes: TNote[]): TNote[] {
  return [...notes].sort((left, right) => {
    return right.data.updated_at.localeCompare(left.data.updated_at);
  });
}

export function getUniqueSortedTags(notes: NoteLike[]): string[] {
  return Array.from(new Set(notes.flatMap((note) => note.data.tags ?? []))).sort((left, right) =>
    left.localeCompare(right)
  );
}
```

- [ ] **Step 5: Create Astro content collection schema**

Create `src/content/config.ts`:

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const notes = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./content/notes" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    source_id: z.string(),
    publish: z.boolean().default(true),
    draft: z.boolean().default(false),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    language: z.enum(["en", "vi", "zh", "ja"]).default("en"),
    created_at: z.string(),
    updated_at: z.string(),
    source: z.enum(["obsidian", "notion"]).default("obsidian"),
    obsidian_path: z.string().optional(),
    cover_image: z.string().optional(),
    canonical_url: z.string().optional()
  })
});

export const collections = { notes };
```

- [ ] **Step 6: Create sample note and asset**

Create `content/notes/example-note.md`:

```md
---
title: "Example Note"
slug: "example-note"
source_id: "obsidian-example-note"
publish: true
draft: false
description: "A sample published note for proving the Astro content contract."
tags:
  - example
  - publishing
language: "en"
created_at: "2026-06-30"
updated_at: "2026-06-30"
source: "obsidian"
cover_image: "/assets/notes/example-note/cover.svg"
---

# Example Note

This note proves that root-level `content/notes` files are loaded by Astro.

![Example cover](/assets/notes/example-note/cover.svg)
```

Create `public/assets/notes/example-note/cover.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">Example note cover</title>
  <desc id="desc">A simple cover image for the example note.</desc>
  <rect width="1200" height="630" fill="#f6f1e8"/>
  <rect x="120" y="110" width="960" height="410" rx="16" fill="#ffffff" stroke="#1f2937" stroke-width="10"/>
  <path d="M220 240h500M220 330h760M220 420h420" stroke="#2563eb" stroke-width="28" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 7: Verify site helpers**

Run: `npm run test`

Expected: PASS for `tests/site-notes.test.ts`.

- [ ] **Step 8: Commit content contract**

```bash
git add src/content/config.ts src/lib/slug.ts src/lib/notes.ts tests/site-notes.test.ts content/notes/example-note.md public/assets/notes/example-note/cover.svg
git commit -m "feat: add Astro content contract"
```

---

### Task 3: Astro Pages and SEO

**Files:**
- Create: `src/lib/seo.ts`
- Create: `tests/site-seo.test.ts`
- Create: `src/components/Seo.astro`
- Create: `src/components/NoteCard.astro`
- Create: `src/components/NoteMeta.astro`
- Create: `src/layouts/NoteLayout.astro`
- Create: `src/pages/index.astro`
- Create: `src/pages/notes/[slug].astro`
- Create: `src/pages/tags/[tag].astro`

- [ ] **Step 1: Write failing SEO tests**

Create `tests/site-seo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCanonicalUrl, buildNoteTitle } from "../src/lib/seo";

describe("SEO helpers", () => {
  it("builds the default note title", () => {
    expect(buildNoteTitle("How I Read Books")).toBe("How I Read Books | Duong Dao Notes");
  });

  it("builds canonical URLs without duplicate slashes", () => {
    expect(buildCanonicalUrl("https://notes.duongdao.family/", "/notes/how-i-read-books")).toBe(
      "https://notes.duongdao.family/notes/how-i-read-books"
    );
  });
});
```

- [ ] **Step 2: Run tests to verify missing implementation**

Run: `npm run test`

Expected: FAIL because `src/lib/seo.ts` does not exist.

- [ ] **Step 3: Create SEO helper**

Create `src/lib/seo.ts`:

```ts
export const SITE_NAME = "Duong Dao Notes";

export function buildNoteTitle(title: string): string {
  return `${title} | ${SITE_NAME}`;
}

export function buildCanonicalUrl(site: string, pathname: string): string {
  const normalizedSite = site.replace(/\/$/, "");
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${normalizedSite}${normalizedPathname}`;
}
```

- [ ] **Step 4: Create SEO component**

Create `src/components/Seo.astro`:

```astro
---
import { buildCanonicalUrl, buildNoteTitle, SITE_NAME } from "../lib/seo";

type Props = {
  title: string;
  description?: string;
  pathname: string;
  image?: string;
  isNote?: boolean;
};

const { title, description, pathname, image, isNote = false } = Astro.props;
const pageTitle = isNote ? buildNoteTitle(title) : title;
const canonicalUrl = buildCanonicalUrl(Astro.site?.toString() ?? "https://notes.duongdao.family", pathname);
const metaDescription = description ?? "Public notes by Duong Dao.";
---

<title>{pageTitle}</title>
<meta name="description" content={metaDescription} />
<link rel="canonical" href={canonicalUrl} />
<meta property="og:site_name" content={SITE_NAME} />
<meta property="og:title" content={pageTitle} />
<meta property="og:description" content={metaDescription} />
<meta property="og:url" content={canonicalUrl} />
{image && <meta property="og:image" content={buildCanonicalUrl(Astro.site?.toString() ?? "https://notes.duongdao.family", image)} />}
<meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
```

- [ ] **Step 5: Create note UI components**

Create `src/components/NoteCard.astro`:

```astro
---
type Props = {
  title: string;
  description?: string;
  href: string;
  updatedAt: string;
  tags?: string[];
};

const { title, description, href, updatedAt, tags = [] } = Astro.props;
---

<article class="note-card">
  <a href={href}>
    <h2>{title}</h2>
    {description && <p>{description}</p>}
    <small>{updatedAt}</small>
  </a>
  {tags.length > 0 && (
    <ul aria-label="Tags">
      {tags.map((tag) => <li><a href={`/tags/${tag}`}>{tag}</a></li>)}
    </ul>
  )}
</article>
```

Create `src/components/NoteMeta.astro`:

```astro
---
type Props = {
  createdAt: string;
  updatedAt: string;
  tags?: string[];
};

const { createdAt, updatedAt, tags = [] } = Astro.props;
---

<div class="note-meta">
  <span>Created {createdAt}</span>
  <span>Updated {updatedAt}</span>
  {tags.map((tag) => <a href={`/tags/${tag}`}>#{tag}</a>)}
</div>
```

- [ ] **Step 6: Create note layout**

Create `src/layouts/NoteLayout.astro`:

```astro
---
import Seo from "../components/Seo.astro";
import NoteMeta from "../components/NoteMeta.astro";

type Props = {
  title: string;
  description?: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  coverImage?: string;
};

const { title, description, slug, createdAt, updatedAt, tags = [], coverImage } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Seo title={title} description={description} pathname={`/notes/${slug}`} image={coverImage} isNote />
  </head>
  <body>
    <main class="note-shell">
      <a class="home-link" href="/">Duong Dao Notes</a>
      <article>
        <header>
          <h1>{title}</h1>
          <NoteMeta createdAt={createdAt} updatedAt={updatedAt} tags={tags} />
          {coverImage && <img class="cover" src={coverImage} alt="" />}
        </header>
        <div class="note-body">
          <slot />
        </div>
      </article>
    </main>
  </body>
</html>

<style>
  :global(body) {
    margin: 0;
    color: #1f2937;
    background: #fafafa;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.65;
  }

  .note-shell {
    width: min(760px, calc(100% - 32px));
    margin: 0 auto;
    padding: 32px 0 64px;
  }

  .home-link {
    display: inline-block;
    margin-bottom: 32px;
    color: #2563eb;
  }

  h1 {
    font-size: clamp(2rem, 6vw, 3.5rem);
    line-height: 1.1;
    margin: 0 0 12px;
  }

  .cover {
    width: 100%;
    margin: 28px 0;
    border-radius: 8px;
  }

  .note-body :global(img) {
    max-width: 100%;
    border-radius: 8px;
  }
</style>
```

- [ ] **Step 7: Create routes**

Create `src/pages/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import Seo from "../components/Seo.astro";
import NoteCard from "../components/NoteCard.astro";
import { getPublicPathForSlug } from "../lib/slug";
import { sortNotesNewestFirst } from "../lib/notes";

const notes = sortNotesNewestFirst((await getCollection("notes")).filter((note) => !note.data.draft));
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Seo title="Duong Dao Notes" pathname="/" />
  </head>
  <body>
    <main>
      <h1>Duong Dao Notes</h1>
      <section aria-label="Recent notes">
        {notes.map((note) => (
          <NoteCard
            title={note.data.title}
            description={note.data.description}
            href={getPublicPathForSlug(note.data.slug)}
            updatedAt={note.data.updated_at}
            tags={note.data.tags}
          />
        ))}
      </section>
    </main>
  </body>
</html>
```

Create `src/pages/notes/[slug].astro`:

```astro
---
import { getCollection, render } from "astro:content";
import NoteLayout from "../../layouts/NoteLayout.astro";

export async function getStaticPaths() {
  const notes = (await getCollection("notes")).filter((note) => !note.data.draft);
  return notes.map((note) => ({
    params: { slug: note.data.slug },
    props: { note }
  }));
}

const { note } = Astro.props;
const { Content } = await render(note);
---

<NoteLayout
  title={note.data.title}
  description={note.data.description}
  slug={note.data.slug}
  createdAt={note.data.created_at}
  updatedAt={note.data.updated_at}
  tags={note.data.tags}
  coverImage={note.data.cover_image}
>
  <Content />
</NoteLayout>
```

Create `src/pages/tags/[tag].astro`:

```astro
---
import { getCollection } from "astro:content";
import Seo from "../../components/Seo.astro";
import NoteCard from "../../components/NoteCard.astro";
import { getUniqueSortedTags, sortNotesNewestFirst } from "../../lib/notes";
import { getPublicPathForSlug } from "../../lib/slug";

export async function getStaticPaths() {
  const notes = (await getCollection("notes")).filter((note) => !note.data.draft);
  return getUniqueSortedTags(notes).map((tag) => ({
    params: { tag },
    props: { tag, notes: sortNotesNewestFirst(notes.filter((note) => note.data.tags.includes(tag))) }
  }));
}

const { tag, notes } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Seo title={`#${tag} | Duong Dao Notes`} pathname={`/tags/${tag}`} />
  </head>
  <body>
    <main>
      <a href="/">Duong Dao Notes</a>
      <h1>#{tag}</h1>
      <section aria-label={`Notes tagged ${tag}`}>
        {notes.map((note) => (
          <NoteCard
            title={note.data.title}
            description={note.data.description}
            href={getPublicPathForSlug(note.data.slug)}
            updatedAt={note.data.updated_at}
            tags={note.data.tags}
          />
        ))}
      </section>
    </main>
  </body>
</html>
```

- [ ] **Step 8: Verify site**

Run: `npm run test`

Expected: PASS for site tests.

Run: `npm run build`

Expected: PASS and `dist/notes/example-note/index.html` exists.

- [ ] **Step 9: Commit Astro pages**

```bash
git add src tests
git commit -m "feat: render public Astro notes"
```

---

### Task 4: GitHub Pages Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `public/CNAME`
- Modify: `README.md`

- [ ] **Step 1: Create custom domain file**

Create `public/CNAME`:

```txt
notes.duongdao.family
```

- [ ] **Step 2: Create GitHub Pages workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Astro site to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Document deployment setup**

Append to `README.md`:

```md
## GitHub Pages Deployment

In the GitHub repository settings, set Pages source to GitHub Actions.

The workflow at `.github/workflows/deploy.yml` builds Astro and deploys the `dist` artifact.

For the custom domain, configure `notes.duongdao.family`, add the matching DNS record, wait for verification, then enable HTTPS enforcement.
```

- [ ] **Step 4: Verify workflow-adjacent build**

Run: `npm run build`

Expected: PASS locally before relying on GitHub Actions.

- [ ] **Step 5: Commit deployment files**

```bash
git add .github/workflows/deploy.yml public/CNAME README.md
git commit -m "ci: deploy Astro site to GitHub Pages"
```

---

### Task 5: Obsidian Plugin Scaffold and Settings

**Files:**
- Create: `plugin/package.json`
- Create: `plugin/tsconfig.json`
- Create: `plugin/esbuild.config.mjs`
- Create: `plugin/manifest.json`
- Create: `plugin/src/settings.ts`
- Create: `plugin/src/main.ts`
- Create: `plugin/src/__tests__/settings.test.ts`

- [ ] **Step 1: Create failing settings test**

Create `plugin/src/__tests__/settings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "../settings";

describe("Astro Publisher settings", () => {
  it("uses safe MVP defaults", () => {
    expect(DEFAULT_SETTINGS.githubBranch).toBe("main");
    expect(DEFAULT_SETTINGS.notesDirectory).toBe("content/notes");
    expect(DEFAULT_SETTINGS.assetsDirectory).toBe("public/assets/notes");
    expect(DEFAULT_SETTINGS.requirePublishManifestConfirmation).toBe(true);
  });

  it("normalizes missing settings without erasing configured values", () => {
    const settings = normalizeSettings({ githubOwner: "duongdao", githubRepo: "notes-site" });
    expect(settings.githubOwner).toBe("duongdao");
    expect(settings.githubRepo).toBe("notes-site");
    expect(settings.siteBaseUrl).toBe("https://notes.duongdao.family");
  });
});
```

- [ ] **Step 2: Create plugin package files**

Create `plugin/package.json`:

```json
{
  "name": "obsidian-astro-publisher",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node esbuild.config.mjs production",
    "dev": "node esbuild.config.mjs",
    "test": "vitest run"
  },
  "dependencies": {
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "builtin-modules": "^4.0.0",
    "esbuild": "^0.24.0",
    "obsidian": "^1.7.2",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  }
}
```

Create `plugin/tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2022",
    "allowJs": true,
    "noImplicitAny": true,
    "moduleResolution": "Bundler",
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "lib": ["DOM", "ES2022"],
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts"]
}
```

Create `plugin/esbuild.config.mjs`:

```js
import esbuild from "esbuild";
import builtins from "builtin-modules";

const production = process.argv[2] === "production";

await esbuild.build({
  banner: {
    js: "/* Obsidian Astro Publisher */"
  },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/autocomplete", "@codemirror/collab", "@codemirror/commands", "@codemirror/language", "@codemirror/lint", "@codemirror/search", "@codemirror/state", "@codemirror/view", "@lezer/common", "@lezer/highlight", "@lezer/lr", ...builtins],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: production
});
```

Create `plugin/manifest.json`:

```json
{
  "id": "astro-publisher",
  "name": "Astro Publisher",
  "version": "0.1.0",
  "minAppVersion": "1.5.0",
  "description": "Publish selected Obsidian notes to an Astro static site through GitHub Pages.",
  "author": "Duong Dao",
  "isDesktopOnly": false
}
```

- [ ] **Step 3: Implement settings**

Create `plugin/src/settings.ts`:

```ts
import { App, PluginSettingTab, Setting } from "obsidian";
import type AstroPublisherPlugin from "./main";

export type SupportedLanguage = "en" | "vi" | "zh" | "ja";

export type AstroPublisherSettings = {
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubToken: string;
  siteBaseUrl: string;
  notesDirectory: string;
  assetsDirectory: string;
  defaultLanguage: SupportedLanguage;
  autoGenerateSlug: boolean;
  updateLocalFrontmatterAfterPublish: boolean;
  confirmBeforePublishIfPublishFalse: boolean;
  confirmBeforeUnpublish: boolean;
  requirePublishManifestConfirmation: boolean;
};

export const DEFAULT_SETTINGS: AstroPublisherSettings = {
  githubOwner: "",
  githubRepo: "",
  githubBranch: "main",
  githubToken: "",
  siteBaseUrl: "https://notes.duongdao.family",
  notesDirectory: "content/notes",
  assetsDirectory: "public/assets/notes",
  defaultLanguage: "en",
  autoGenerateSlug: true,
  updateLocalFrontmatterAfterPublish: true,
  confirmBeforePublishIfPublishFalse: true,
  confirmBeforeUnpublish: true,
  requirePublishManifestConfirmation: true
};

export function normalizeSettings(saved: Partial<AstroPublisherSettings> | null | undefined): AstroPublisherSettings {
  return { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
}

export class AstroPublisherSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: AstroPublisherPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("GitHub owner").addText((text) =>
      text.setValue(this.plugin.settings.githubOwner).onChange(async (value) => {
        this.plugin.settings.githubOwner = value.trim();
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("GitHub repository").addText((text) =>
      text.setValue(this.plugin.settings.githubRepo).onChange(async (value) => {
        this.plugin.settings.githubRepo = value.trim();
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("GitHub branch").addText((text) =>
      text.setValue(this.plugin.settings.githubBranch).onChange(async (value) => {
        this.plugin.settings.githubBranch = value.trim() || DEFAULT_SETTINGS.githubBranch;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("GitHub token").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(this.plugin.settings.githubToken).onChange(async (value) => {
        this.plugin.settings.githubToken = value.trim();
        await this.plugin.saveSettings();
      });
    });

    new Setting(containerEl).setName("Site base URL").addText((text) =>
      text.setValue(this.plugin.settings.siteBaseUrl).onChange(async (value) => {
        this.plugin.settings.siteBaseUrl = value.trim().replace(/\/$/, "");
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Notes directory").addText((text) =>
      text.setValue(this.plugin.settings.notesDirectory).onChange(async (value) => {
        this.plugin.settings.notesDirectory = value.trim() || DEFAULT_SETTINGS.notesDirectory;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Assets directory").addText((text) =>
      text.setValue(this.plugin.settings.assetsDirectory).onChange(async (value) => {
        this.plugin.settings.assetsDirectory = value.trim() || DEFAULT_SETTINGS.assetsDirectory;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Default language").addDropdown((dropdown) => {
      dropdown
        .addOption("en", "English")
        .addOption("vi", "Vietnamese")
        .addOption("zh", "Chinese")
        .addOption("ja", "Japanese")
        .setValue(this.plugin.settings.defaultLanguage)
        .onChange(async (value) => {
          this.plugin.settings.defaultLanguage = value as SupportedLanguage;
          await this.plugin.saveSettings();
        });
    });

    new Setting(containerEl).setName("Auto-generate slug").addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.autoGenerateSlug).onChange(async (value) => {
        this.plugin.settings.autoGenerateSlug = value;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Update local frontmatter after publish").addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.updateLocalFrontmatterAfterPublish).onChange(async (value) => {
        this.plugin.settings.updateLocalFrontmatterAfterPublish = value;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Confirm before publishing notes without publish: true").addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.confirmBeforePublishIfPublishFalse).onChange(async (value) => {
        this.plugin.settings.confirmBeforePublishIfPublishFalse = value;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Confirm before unpublish").addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.confirmBeforeUnpublish).onChange(async (value) => {
        this.plugin.settings.confirmBeforeUnpublish = value;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Require publish manifest confirmation").addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.requirePublishManifestConfirmation).onChange(async (value) => {
        this.plugin.settings.requirePublishManifestConfirmation = value;
        await this.plugin.saveSettings();
      })
    );
  }
}
```

- [ ] **Step 4: Implement plugin entry**

Create `plugin/src/main.ts`:

```ts
import { Notice, Plugin } from "obsidian";
import { AstroPublisherSettingTab, type AstroPublisherSettings, normalizeSettings } from "./settings";

export default class AstroPublisherPlugin extends Plugin {
  settings: AstroPublisherSettings = normalizeSettings(null);

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new AstroPublisherSettingTab(this.app, this));

    this.addCommand({
      id: "publish-current-note",
      name: "Publish current note",
      callback: () => new Notice("Astro Publisher loaded.")
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
```

- [ ] **Step 5: Install plugin dependencies**

Run: `npm install --prefix plugin`

Expected: command exits `0` and creates `plugin/package-lock.json`.

- [ ] **Step 6: Verify plugin scaffold**

Run: `npm run plugin:test`

Expected: PASS for `plugin/src/__tests__/settings.test.ts`.

Run: `npm run plugin:build`

Expected: PASS and `plugin/main.js` exists.

- [ ] **Step 7: Commit plugin scaffold**

```bash
git add plugin/package.json plugin/package-lock.json plugin/tsconfig.json plugin/esbuild.config.mjs plugin/manifest.json plugin/src
git commit -m "feat: scaffold Obsidian publisher plugin"
```

---

### Task 6: Plugin Core Transformations

**Files:**
- Create: `plugin/src/core/slug.ts`
- Create: `plugin/src/core/frontmatter.ts`
- Create: `plugin/src/core/markdown.ts`
- Create: `plugin/src/core/assets.ts`
- Create: `plugin/src/core/manifest.ts`
- Create: `plugin/src/__tests__/core.test.ts`

- [ ] **Step 1: Write failing core tests**

Create `plugin/src/__tests__/core.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildPublishManifestText } from "../core/manifest";
import { normalizeFrontmatter } from "../core/frontmatter";
import { collectEmbeds, transformObsidianMarkdown } from "../core/markdown";
import { generateSlug, isValidSlug } from "../core/slug";

describe("slug core", () => {
  it("transliterates Vietnamese titles into v1-safe slugs", () => {
    expect(generateSlug("Tôi đã đọc sách như thế nào")).toBe("toi-da-doc-sach-nhu-the-nao");
  });

  it("validates v1 slug shape", () => {
    expect(isValidSlug("cell-based-architecture-with-rails")).toBe(true);
    expect(isValidSlug("Cell Based Architecture")).toBe(false);
  });
});

describe("frontmatter core", () => {
  it("adds stable source_id without exposing paths", () => {
    const normalized = normalizeFrontmatter(
      { title: "How I Read Books", publish: true, tags: ["reading"] },
      { generatedSlug: "how-i-read-books", generatedSourceId: "obsidian-123", defaultLanguage: "en", today: "2026-06-30" }
    );

    expect(normalized.source_id).toBe("obsidian-123");
    expect(normalized.slug).toBe("how-i-read-books");
    expect(normalized.obsidian_path).toBeUndefined();
  });
});

describe("markdown core", () => {
  const published = new Map([["How I Read Books", "how-i-read-books"]]);

  it("rewrites published wiki links and plain-texts unpublished links", () => {
    expect(transformObsidianMarkdown("See [[How I Read Books]] and [[Private Note]].", { publishedNotes: published, slug: "current" }).markdown).toBe(
      "See [How I Read Books](/notes/how-i-read-books) and Private Note."
    );
  });

  it("rewrites supported image embeds", () => {
    expect(transformObsidianMarkdown("![[diagram.png|Architecture diagram]]", { publishedNotes: published, slug: "how-i-read-books" }).markdown).toBe(
      "![Architecture diagram](/assets/notes/how-i-read-books/diagram.png)"
    );
  });

  it("collects embed references", () => {
    expect(collectEmbeds("![[cover.png]] and ![[diagram.png|Diagram]]")).toEqual(["cover.png", "diagram.png"]);
  });
});

describe("manifest core", () => {
  it("renders the files that will become public", () => {
    expect(
      buildPublishManifestText({
        localNotePath: "Essays/How I Read Books.md",
        destinationNotePath: "content/notes/how-i-read-books.md",
        publicUrl: "https://notes.duongdao.family/notes/how-i-read-books",
        assets: ["public/assets/notes/how-i-read-books/cover.png"]
      })
    ).toContain("public/assets/notes/how-i-read-books/cover.png");
  });
});
```

- [ ] **Step 2: Run core tests to verify missing implementation**

Run: `npm run plugin:test`

Expected: FAIL because `plugin/src/core/*` modules do not exist.

- [ ] **Step 3: Implement slug core**

Create `plugin/src/core/slug.ts`:

```ts
const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function generateSlug(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isValidSlug(slug: string): boolean {
  return VALID_SLUG.test(slug);
}
```

- [ ] **Step 4: Implement frontmatter core**

Create `plugin/src/core/frontmatter.ts`:

```ts
export type PublicFrontmatter = {
  title: string;
  slug: string;
  source_id: string;
  publish: boolean;
  draft: boolean;
  description?: string;
  tags: string[];
  language: "en" | "vi" | "zh" | "ja";
  created_at: string;
  updated_at: string;
  source: "obsidian";
  cover_image?: string;
  canonical_url?: string;
  obsidian_path?: string;
};

export type NormalizeFrontmatterOptions = {
  generatedSlug: string;
  generatedSourceId: string;
  defaultLanguage: "en" | "vi" | "zh" | "ja";
  today: string;
  includeObsidianPath?: string;
};

export function normalizeFrontmatter(
  input: Record<string, unknown>,
  options: NormalizeFrontmatterOptions
): PublicFrontmatter {
  const title = typeof input.title === "string" ? input.title : "";
  if (!title.trim()) {
    throw new Error("Cannot publish this note because frontmatter field \"title\" is missing.");
  }

  const slug = typeof input.slug === "string" && input.slug.trim() ? input.slug.trim() : options.generatedSlug;
  const sourceId = typeof input.source_id === "string" && input.source_id.trim() ? input.source_id.trim() : options.generatedSourceId;
  const tags = Array.isArray(input.tags) ? input.tags.filter((tag): tag is string => typeof tag === "string") : [];

  return {
    title,
    slug,
    source_id: sourceId,
    publish: input.publish === true,
    draft: input.draft === true,
    description: typeof input.description === "string" ? input.description : undefined,
    tags,
    language: isSupportedLanguage(input.language) ? input.language : options.defaultLanguage,
    created_at: typeof input.created_at === "string" ? input.created_at : options.today,
    updated_at: options.today,
    source: "obsidian",
    cover_image: typeof input.cover_image === "string" ? input.cover_image : undefined,
    canonical_url: typeof input.canonical_url === "string" ? input.canonical_url : undefined,
    obsidian_path: options.includeObsidianPath
  };
}

function isSupportedLanguage(value: unknown): value is PublicFrontmatter["language"] {
  return value === "en" || value === "vi" || value === "zh" || value === "ja";
}
```

- [ ] **Step 5: Implement Markdown transform core**

Create `plugin/src/core/markdown.ts`:

```ts
const SUPPORTED_ASSET_EXTENSION = /\.(png|jpe?g|webp|gif|svg|pdf)$/i;

export type TransformMarkdownOptions = {
  publishedNotes: Map<string, string>;
  slug: string;
};

export type TransformMarkdownResult = {
  markdown: string;
  assetReferences: string[];
};

export function collectEmbeds(markdown: string): string[] {
  return Array.from(markdown.matchAll(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)).map((match) => match[1]);
}

export function transformObsidianMarkdown(markdown: string, options: TransformMarkdownOptions): TransformMarkdownResult {
  const assetReferences: string[] = [];

  const withImages = markdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_full, target: string, label?: string) => {
    if (!SUPPORTED_ASSET_EXTENSION.test(target)) {
      throw new Error(`Cannot publish this note because the embedded file "${target}" is not a supported asset.`);
    }

    assetReferences.push(target);
    const alt = label?.trim() || target.replace(/\.[^.]+$/, "");
    return `![${alt}](/assets/notes/${options.slug}/${target})`;
  });

  const withLinks = withImages.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_full, target: string, label?: string) => {
    const text = label?.trim() || target;
    const linkedSlug = options.publishedNotes.get(target);
    return linkedSlug ? `[${text}](/notes/${linkedSlug})` : text;
  });

  return { markdown: withLinks, assetReferences };
}
```

- [ ] **Step 6: Implement manifest core**

Create `plugin/src/core/manifest.ts`:

```ts
export type PublishManifest = {
  localNotePath: string;
  destinationNotePath: string;
  publicUrl: string;
  assets: string[];
};

export function buildPublishManifestText(manifest: PublishManifest): string {
  const assetLines = manifest.assets.length > 0 ? manifest.assets.map((asset) => `- ${asset}`).join("\n") : "- No assets";

  return [
    "Publishing this note will make these files public:",
    "",
    `Local note: ${manifest.localNotePath}`,
    `Destination note: ${manifest.destinationNotePath}`,
    `Public URL: ${manifest.publicUrl}`,
    "",
    "Assets:",
    assetLines
  ].join("\n");
}
```

- [ ] **Step 7: Implement asset validation core**

Create `plugin/src/core/assets.ts`:

```ts
export function assertNoAssetNameCollisions(filenames: string[]): void {
  const seen = new Set<string>();
  for (const filename of filenames) {
    const normalized = filename.toLowerCase();
    if (seen.has(normalized)) {
      throw new Error(`Cannot publish this note because more than one embedded asset is named "${filename}".`);
    }
    seen.add(normalized);
  }
}
```

- [ ] **Step 8: Verify core behavior**

Run: `npm run plugin:test`

Expected: PASS for settings and core tests.

- [ ] **Step 9: Commit plugin core**

```bash
git add plugin/src/core plugin/src/__tests__/core.test.ts
git commit -m "feat: add publisher transformation core"
```

---

### Task 7: GitHub Contents API Client

**Files:**
- Create: `plugin/src/github/contentsClient.ts`
- Create: `plugin/src/__tests__/github-client.test.ts`

- [ ] **Step 1: Write failing GitHub client tests**

Create `plugin/src/__tests__/github-client.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { GitHubContentsClient } from "../github/contentsClient";

describe("GitHubContentsClient", () => {
  it("creates files with base64 content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ content: { sha: "new-sha" } }) });
    const client = new GitHubContentsClient({ owner: "duongdao", repo: "notes-site", branch: "main", token: "token", fetch: fetchMock });

    await client.putFile({ path: "content/notes/example.md", content: "hello", message: "Publish note: example" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/duongdao/notes-site/contents/content/notes/example.md",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ Authorization: "Bearer token" })
      })
    );
  });

  it("deletes files with sha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const client = new GitHubContentsClient({ owner: "duongdao", repo: "notes-site", branch: "main", token: "token", fetch: fetchMock });

    await client.deleteFile({ path: "content/notes/example.md", sha: "abc123", message: "Unpublish note: example" });

    const [, request] = fetchMock.mock.calls[0];
    expect(request.method).toBe("DELETE");
    expect(JSON.parse(request.body)).toMatchObject({ sha: "abc123", branch: "main" });
  });

  it("encodes path segments but keeps slashes between them", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ path: "public/assets/notes/how-i-read-books/my cover.png", sha: "asset-sha" })
    });
    const client = new GitHubContentsClient({ owner: "duongdao", repo: "notes-site", branch: "main", token: "token", fetch: fetchMock });

    await client.getFile("public/assets/notes/how-i-read-books/my cover.png");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.github.com/repos/duongdao/notes-site/contents/public/assets/notes/how-i-read-books/my%20cover.png"
    );
  });
});
```

- [ ] **Step 2: Run tests to verify missing implementation**

Run: `npm run plugin:test`

Expected: FAIL because `plugin/src/github/contentsClient.ts` does not exist.

- [ ] **Step 3: Implement GitHub client**

Create `plugin/src/github/contentsClient.ts`:

```ts
export type GitHubContentsClientOptions = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  fetch?: typeof fetch;
};

export type GitHubFile = {
  path: string;
  sha: string;
  content?: string;
};

type PutFileInput = {
  path: string;
  content: string | ArrayBuffer;
  message: string;
  sha?: string;
};

type DeleteFileInput = {
  path: string;
  sha: string;
  message: string;
};

export class GitHubContentsClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: GitHubContentsClientOptions) {
    this.fetchImpl = options.fetch ?? fetch;
  }

  async getFile(path: string): Promise<GitHubFile | null> {
    const response = await this.request(path, { method: "GET" });
    if (response.status === 404) {
      return null;
    }
    await assertOk(response);
    const json = await response.json();
    return {
      path: json.path,
      sha: json.sha,
      content: typeof json.content === "string" ? json.content : undefined
    };
  }

  async listDirectory(path: string): Promise<GitHubFile[]> {
    const response = await this.request(path, { method: "GET" });
    if (response.status === 404) {
      return [];
    }
    await assertOk(response);
    const json = await response.json();
    if (!Array.isArray(json)) {
      throw new Error(`Expected GitHub path "${path}" to be a directory.`);
    }
    return json.map((item) => ({ path: item.path, sha: item.sha }));
  }

  async putFile(input: PutFileInput): Promise<void> {
    const body: Record<string, string> = {
      message: input.message,
      content: encodeBase64(input.content),
      branch: this.options.branch
    };

    if (input.sha) {
      body.sha = input.sha;
    }

    const response = await this.request(input.path, {
      method: "PUT",
      body: JSON.stringify(body)
    });
    await assertOk(response);
  }

  async deleteFile(input: DeleteFileInput): Promise<void> {
    const response = await this.request(input.path, {
      method: "DELETE",
      body: JSON.stringify({
        message: input.message,
        sha: input.sha,
        branch: this.options.branch
      })
    });
    await assertOk(response);
  }

  private request(path: string, init: RequestInit): Promise<Response> {
    return this.fetchImpl(`https://api.github.com/repos/${this.options.owner}/${this.options.repo}/contents/${encodePath(path)}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.options.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
  }
}

function encodePath(path: string): string {
  // GitHub Contents API expects raw "/" between path segments. Encoding the
  // whole path (e.g. encodeURIComponent) would turn "/" into "%2F" and break
  // the request, so encode each segment and rejoin with literal slashes.
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function encodeBase64(content: string | ArrayBuffer): string {
  if (typeof content === "string") {
    return Buffer.from(content, "utf8").toString("base64");
  }
  return Buffer.from(content).toString("base64");
}

async function assertOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const message = await response.text().catch(() => "");
  throw new Error(`GitHub API request failed with ${response.status}: ${message}`);
}
```

- [ ] **Step 4: Verify GitHub client**

Run: `npm run plugin:test`

Expected: PASS for GitHub client tests.

- [ ] **Step 5: Commit GitHub client**

```bash
git add plugin/src/github plugin/src/__tests__/github-client.test.ts
git commit -m "feat: add GitHub contents client"
```

---

### Task 8: Publish and Update Orchestration

**Files:**
- Create: `plugin/src/publisher.ts`
- Create: `plugin/src/obsidianAdapter.ts`
- Create: `plugin/src/ui/PublishManifestModal.ts`
- Create: `plugin/src/ui/messages.ts`
- Modify: `plugin/src/main.ts`
- Create: `plugin/src/__tests__/publisher.test.ts`

- [ ] **Step 1: Write failing publisher tests**

Create `plugin/src/__tests__/publisher.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { publishCurrentNote } from "../publisher";

describe("publishCurrentNote", () => {
  it("uploads assets before markdown", async () => {
    const calls: string[] = [];
    const github = {
      getFile: vi.fn().mockResolvedValue(null),
      putFile: vi.fn().mockImplementation(async ({ path }: { path: string }) => {
        calls.push(path);
      })
    };

    await publishCurrentNote({
      note: {
        path: "Essays/How I Read Books.md",
        basename: "How I Read Books",
        markdown: "---\ntitle: How I Read Books\npublish: true\n---\n![[cover.png]]"
      },
      settings: {
        githubOwner: "duongdao",
        githubRepo: "notes-site",
        githubBranch: "main",
        githubToken: "token",
        siteBaseUrl: "https://notes.duongdao.family",
        notesDirectory: "content/notes",
        assetsDirectory: "public/assets/notes",
        defaultLanguage: "en",
        autoGenerateSlug: true,
        updateLocalFrontmatterAfterPublish: true,
        confirmBeforePublishIfPublishFalse: true,
        confirmBeforeUnpublish: true,
        requirePublishManifestConfirmation: false
      },
      github,
      adapter: {
        readBinaryAsset: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
        writeFrontmatter: vi.fn(),
        listPublishedNotes: vi.fn().mockResolvedValue(new Map()),
        confirm: vi.fn().mockResolvedValue(true),
        today: () => "2026-06-30",
        generateSourceId: () => "obsidian-123"
      }
    });

    expect(calls).toEqual(["public/assets/notes/how-i-read-books/cover.png", "content/notes/how-i-read-books.md"]);
  });

  it("rejects slug collisions from a different source_id", async () => {
    const github = {
      getFile: vi.fn().mockResolvedValue({
        sha: "existing-sha",
        content: Buffer.from("---\ntitle: Other\nslug: how-i-read-books\nsource_id: obsidian-other\n---").toString("base64")
      }),
      putFile: vi.fn()
    };

    await expect(
      publishCurrentNote({
        note: { path: "Essays/How I Read Books.md", basename: "How I Read Books", markdown: "---\ntitle: How I Read Books\npublish: true\n---\nBody" },
        settings: {
          githubOwner: "duongdao",
          githubRepo: "notes-site",
          githubBranch: "main",
          githubToken: "token",
          siteBaseUrl: "https://notes.duongdao.family",
          notesDirectory: "content/notes",
          assetsDirectory: "public/assets/notes",
          defaultLanguage: "en",
          autoGenerateSlug: true,
          updateLocalFrontmatterAfterPublish: true,
          confirmBeforePublishIfPublishFalse: true,
          confirmBeforeUnpublish: true,
          requirePublishManifestConfirmation: false
        },
        github,
        adapter: {
          readBinaryAsset: vi.fn(),
          writeFrontmatter: vi.fn(),
          listPublishedNotes: vi.fn().mockResolvedValue(new Map()),
          confirm: vi.fn().mockResolvedValue(true),
          today: () => "2026-06-30",
          generateSourceId: () => "obsidian-123"
        }
      })
    ).rejects.toThrow("already belongs to a different source_id");
  });
});
```

- [ ] **Step 2: Run tests to verify missing publisher**

Run: `npm run plugin:test`

Expected: FAIL because `plugin/src/publisher.ts` does not exist.

- [ ] **Step 3: Implement publisher orchestration**

Create `plugin/src/publisher.ts`:

```ts
import matter from "gray-matter";
import type { AstroPublisherSettings } from "./settings";
import { normalizeFrontmatter } from "./core/frontmatter";
import { assertNoAssetNameCollisions } from "./core/assets";
import { generateSlug } from "./core/slug";
import { buildPublishManifestText } from "./core/manifest";
import { transformObsidianMarkdown } from "./core/markdown";

export type ActiveNote = {
  path: string;
  basename: string;
  markdown: string;
};

export type PublisherGitHub = {
  getFile(path: string): Promise<{ sha: string; content?: string } | null>;
  putFile(input: { path: string; content: string | ArrayBuffer; message: string; sha?: string }): Promise<void>;
};

export type PublisherAdapter = {
  readBinaryAsset(filename: string): Promise<ArrayBuffer>;
  writeFrontmatter(path: string, frontmatter: Record<string, unknown>): Promise<void>;
  listPublishedNotes(): Promise<Map<string, string>>;
  confirm(message: string): Promise<boolean>;
  today(): string;
  generateSourceId(): string;
};

export type PublishCurrentNoteInput = {
  note: ActiveNote;
  settings: AstroPublisherSettings;
  github: PublisherGitHub;
  adapter: PublisherAdapter;
};

export async function publishCurrentNote(input: PublishCurrentNoteInput): Promise<string> {
  const parsed = matter(input.note.markdown);
  const generatedSlug = generateSlug(input.note.basename);
  const frontmatter = normalizeFrontmatter(parsed.data, {
    generatedSlug,
    generatedSourceId: input.adapter.generateSourceId(),
    defaultLanguage: input.settings.defaultLanguage,
    today: input.adapter.today()
  });

  if (!frontmatter.publish && input.settings.confirmBeforePublishIfPublishFalse) {
    const allowed = await input.adapter.confirm("This note is not marked with publish: true. Publishing will make it public on the internet. Continue?");
    if (!allowed) {
      throw new Error("Publish cancelled.");
    }
  }

  const destinationNotePath = `${input.settings.notesDirectory}/${frontmatter.slug}.md`;
  const existing = await input.github.getFile(destinationNotePath);
  if (existing?.content) {
    const existingMarkdown = Buffer.from(existing.content, "base64").toString("utf8");
    const existingMatter = matter(existingMarkdown);
    if (existingMatter.data.source_id && existingMatter.data.source_id !== frontmatter.source_id) {
      throw new Error(`Cannot publish because slug "${frontmatter.slug}" already belongs to a different source_id.`);
    }
  }

  const publishedNotes = await input.adapter.listPublishedNotes();
  const transformed = transformObsidianMarkdown(parsed.content, { publishedNotes, slug: frontmatter.slug });
  assertNoAssetNameCollisions(transformed.assetReferences);

  const assetDestinations = transformed.assetReferences.map((asset) => `${input.settings.assetsDirectory}/${frontmatter.slug}/${asset}`);
  const publicUrl = `${input.settings.siteBaseUrl.replace(/\/$/, "")}/notes/${frontmatter.slug}`;
  const manifestText = buildPublishManifestText({
    localNotePath: input.note.path,
    destinationNotePath,
    publicUrl,
    assets: assetDestinations
  });

  if (input.settings.requirePublishManifestConfirmation) {
    const allowed = await input.adapter.confirm(manifestText);
    if (!allowed) {
      throw new Error("Publish cancelled.");
    }
  }

  for (let index = 0; index < transformed.assetReferences.length; index += 1) {
    const asset = transformed.assetReferences[index];
    await input.github.putFile({
      path: assetDestinations[index],
      content: await input.adapter.readBinaryAsset(asset),
      message: `Upload asset: ${frontmatter.slug}/${asset}`
    });
  }

  const publicMarkdown = matter.stringify(transformed.markdown, frontmatter);
  await input.github.putFile({
    path: destinationNotePath,
    content: publicMarkdown,
    message: existing ? `Update note: ${frontmatter.slug}` : `Publish note: ${frontmatter.slug}`,
    sha: existing?.sha
  });

  if (input.settings.updateLocalFrontmatterAfterPublish) {
    await input.adapter.writeFrontmatter(input.note.path, frontmatter);
  }

  return publicUrl;
}
```

- [ ] **Step 4: Create UI message helpers**

Create `plugin/src/ui/messages.ts`:

```ts
export function formatPublishedNotice(publicUrl: string): string {
  return `Published: ${publicUrl}`;
}

export function formatFailureNotice(error: unknown): string {
  return error instanceof Error ? error.message : "Publishing failed.";
}
```

Create `plugin/src/ui/PublishManifestModal.ts`:

```ts
import { Modal, Setting } from "obsidian";

export class PublishManifestModal extends Modal {
  private accepted = false;

  constructor(app: ConstructorParameters<typeof Modal>[0], private readonly text: string) {
    super(app);
  }

  async openAndWait(): Promise<boolean> {
    this.open();
    return new Promise((resolve) => {
      this.onClose = () => resolve(this.accepted);
    });
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Publish note" });
    contentEl.createEl("pre", { text: this.text });
    new Setting(contentEl)
      .addButton((button) =>
        button.setButtonText("Cancel").onClick(() => {
          this.accepted = false;
          this.close();
        })
      )
      .addButton((button) =>
        button.setCta().setButtonText("Publish").onClick(() => {
          this.accepted = true;
          this.close();
        })
      );
  }
}
```

- [ ] **Step 5: Create Obsidian adapter**

Create `plugin/src/obsidianAdapter.ts`:

```ts
import { App, TFile } from "obsidian";
import { generateSlug } from "./core/slug";

export class ObsidianPublisherAdapter {
  constructor(private readonly app: App) {}

  getActiveMarkdownFile(): TFile | null {
    const file = this.app.workspace.getActiveFile();
    return file?.extension === "md" ? file : null;
  }

  async readActiveNote(file: TFile): Promise<{ path: string; basename: string; markdown: string }> {
    return {
      path: file.path,
      basename: file.basename,
      markdown: await this.app.vault.read(file)
    };
  }

  async readBinaryAsset(filename: string): Promise<ArrayBuffer> {
    const file = this.app.metadataCache.getFirstLinkpathDest(filename, "");
    if (!file) {
      throw new Error(`Cannot publish this note because the embedded file "${filename}" was not found in the vault.`);
    }
    return this.app.vault.readBinary(file);
  }

  // Maps each published note's link target (its basename, the text used in
  // [[wiki links]]) to its public slug. transformObsidianMarkdown uses this to
  // decide whether a wiki link becomes a real link or safe plain text.
  async listPublishedNotes(): Promise<Map<string, string>> {
    const published = new Map<string, string>();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (frontmatter?.publish !== true) {
        continue;
      }
      const slug =
        typeof frontmatter.slug === "string" && frontmatter.slug.trim()
          ? frontmatter.slug.trim()
          : generateSlug(file.basename);
      published.set(file.basename, slug);
    }
    return published;
  }

  // Persists the generated/normalized fields (notably source_id and slug) back
  // into the local note so identity stays stable across future publishes.
  async writeFrontmatter(path: string, frontmatter: Record<string, unknown>): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      return;
    }
    await this.app.fileManager.processFrontMatter(file, (existing) => {
      for (const [key, value] of Object.entries(frontmatter)) {
        if (value === undefined) {
          continue;
        }
        existing[key] = value;
      }
    });
  }

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  generateSourceId(): string {
    return `obsidian-${crypto.randomUUID()}`;
  }
}
```

- [ ] **Step 6: Wire publish command in plugin entry**

Modify `plugin/src/main.ts` so the command creates `GitHubContentsClient`, reads the active note, calls `publishCurrentNote`, and shows the resulting notice.

```ts
import { Notice, Plugin } from "obsidian";
import { GitHubContentsClient } from "./github/contentsClient";
import { ObsidianPublisherAdapter } from "./obsidianAdapter";
import { publishCurrentNote, type PublisherAdapter } from "./publisher";
import { AstroPublisherSettingTab, type AstroPublisherSettings, normalizeSettings } from "./settings";
import { PublishManifestModal } from "./ui/PublishManifestModal";
import { formatFailureNotice, formatPublishedNotice } from "./ui/messages";

export default class AstroPublisherPlugin extends Plugin {
  settings: AstroPublisherSettings = normalizeSettings(null);

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new AstroPublisherSettingTab(this.app, this));

    this.addCommand({
      id: "publish-current-note",
      name: "Publish current note",
      callback: () => this.publishCurrentNote()
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  // Builds the PublisherAdapter the orchestration core depends on. `confirm`
  // controls how manifests/warnings are surfaced: interactive single-note
  // publishes pass a modal-backed confirm; the batch command passes an
  // auto-approving confirm (see Task 9) so it does not stack N modals.
  private buildPublisherAdapter(
    adapter: ObsidianPublisherAdapter,
    confirm: (message: string) => Promise<boolean>
  ): PublisherAdapter {
    return {
      readBinaryAsset: (filename) => adapter.readBinaryAsset(filename),
      writeFrontmatter: (path, frontmatter) => adapter.writeFrontmatter(path, frontmatter),
      listPublishedNotes: () => adapter.listPublishedNotes(),
      confirm,
      today: () => adapter.today(),
      generateSourceId: () => adapter.generateSourceId()
    };
  }

  private async publishCurrentNote(): Promise<void> {
    try {
      const adapter = new ObsidianPublisherAdapter(this.app);
      const file = adapter.getActiveMarkdownFile();
      if (!file) {
        new Notice("Open a Markdown note before publishing.");
        return;
      }

      const github = new GitHubContentsClient({
        owner: this.settings.githubOwner,
        repo: this.settings.githubRepo,
        branch: this.settings.githubBranch,
        token: this.settings.githubToken
      });

      const publicUrl = await publishCurrentNote({
        note: await adapter.readActiveNote(file),
        settings: this.settings,
        github,
        adapter: this.buildPublisherAdapter(adapter, (message) =>
          new PublishManifestModal(this.app, message).openAndWait()
        )
      });

      new Notice(formatPublishedNotice(publicUrl));
    } catch (error) {
      new Notice(formatFailureNotice(error));
    }
  }
}
```

- [ ] **Step 7: Verify publisher**

Run: `npm run plugin:test`

Expected: PASS for publisher tests.

Run: `npm run plugin:build`

Expected: PASS.

- [ ] **Step 8: Commit publisher flow**

```bash
git add plugin/src
git commit -m "feat: publish current note through GitHub"
```

---

### Task 9: Unpublish, Copy URL, Open URL, and Publish Marked Notes

**Files:**
- Modify: `plugin/src/publisher.ts`
- Modify: `plugin/src/main.ts`
- Modify: `plugin/src/obsidianAdapter.ts`
- Create: `plugin/src/__tests__/unpublish.test.ts`

- [ ] **Step 1: Write failing unpublish tests**

Create `plugin/src/__tests__/unpublish.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { unpublishNote } from "../publisher";

describe("unpublishNote", () => {
  it("deletes markdown and assets using sha values", async () => {
    const deleted: string[] = [];
    const github = {
      getFile: vi.fn().mockResolvedValue({ sha: "note-sha" }),
      listDirectory: vi.fn().mockResolvedValue([
        { path: "public/assets/notes/how-i-read-books/cover.png", sha: "asset-sha" }
      ]),
      deleteFile: vi.fn().mockImplementation(async ({ path }: { path: string }) => {
        deleted.push(path);
      })
    };

    const result = await unpublishNote({
      slug: "how-i-read-books",
      settings: {
        githubOwner: "duongdao",
        githubRepo: "notes-site",
        githubBranch: "main",
        githubToken: "token",
        siteBaseUrl: "https://notes.duongdao.family",
        notesDirectory: "content/notes",
        assetsDirectory: "public/assets/notes",
        defaultLanguage: "en",
        autoGenerateSlug: true,
        updateLocalFrontmatterAfterPublish: true,
        confirmBeforePublishIfPublishFalse: true,
        confirmBeforeUnpublish: true,
        requirePublishManifestConfirmation: true
      },
      github,
      deleteAssets: true
    });

    expect(deleted).toEqual([
      "content/notes/how-i-read-books.md",
      "public/assets/notes/how-i-read-books/cover.png"
    ]);
    expect(result).toEqual({ status: "unpublished", deletedAssets: 1 });
  });

  it("reports already-unpublished when the markdown file is missing", async () => {
    const github = {
      getFile: vi.fn().mockResolvedValue(null),
      listDirectory: vi.fn(),
      deleteFile: vi.fn()
    };

    const result = await unpublishNote({
      slug: "missing-note",
      settings: {
        githubOwner: "duongdao",
        githubRepo: "notes-site",
        githubBranch: "main",
        githubToken: "token",
        siteBaseUrl: "https://notes.duongdao.family",
        notesDirectory: "content/notes",
        assetsDirectory: "public/assets/notes",
        defaultLanguage: "en",
        autoGenerateSlug: true,
        updateLocalFrontmatterAfterPublish: true,
        confirmBeforePublishIfPublishFalse: true,
        confirmBeforeUnpublish: true,
        requirePublishManifestConfirmation: true
      },
      github,
      deleteAssets: true
    });

    expect(result).toEqual({ status: "already-unpublished", deletedAssets: 0 });
    expect(github.deleteFile).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify missing unpublish implementation**

Run: `npm run plugin:test`

Expected: FAIL because `unpublishNote` is not exported.

- [ ] **Step 3: Implement unpublish orchestration**

Append to `plugin/src/publisher.ts`:

```ts
export type UnpublishInput = {
  slug: string;
  settings: AstroPublisherSettings;
  github: {
    getFile(path: string): Promise<{ sha: string } | null>;
    listDirectory(path: string): Promise<Array<{ path: string; sha: string }>>;
    deleteFile(input: { path: string; sha: string; message: string }): Promise<void>;
  };
  deleteAssets: boolean;
};

export type UnpublishResult = {
  status: "unpublished" | "already-unpublished";
  deletedAssets: number;
};

export async function unpublishNote(input: UnpublishInput): Promise<UnpublishResult> {
  const notePath = `${input.settings.notesDirectory}/${input.slug}.md`;
  const existingNote = await input.github.getFile(notePath);

  // A missing Markdown file is treated as "already unpublished" (spec 11.4),
  // not an error, so the caller can show a clear notice.
  if (!existingNote) {
    return { status: "already-unpublished", deletedAssets: 0 };
  }

  await input.github.deleteFile({
    path: notePath,
    sha: existingNote.sha,
    message: `Unpublish note: ${input.slug}`
  });

  if (!input.deleteAssets) {
    return { status: "unpublished", deletedAssets: 0 };
  }

  const assetDirectory = `${input.settings.assetsDirectory}/${input.slug}`;
  const assets = await input.github.listDirectory(assetDirectory);

  for (const asset of assets) {
    await input.github.deleteFile({
      path: asset.path,
      sha: asset.sha,
      message: `Unpublish asset: ${input.slug}/${asset.path.split("/").pop() ?? "asset"}`
    });
  }

  return { status: "unpublished", deletedAssets: assets.length };
}
```

- [ ] **Step 4: Extend the Obsidian adapter for command workflows**

Modify `plugin/src/obsidianAdapter.ts` to include these methods inside `ObsidianPublisherAdapter`:

```ts
  getMarkdownFiles(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  async readNoteFile(file: TFile): Promise<{ path: string; basename: string; markdown: string }> {
    return {
      path: file.path,
      basename: file.basename,
      markdown: await this.app.vault.read(file)
    };
  }
```

- [ ] **Step 5: Register complete command callbacks**

Modify the command registration block in `plugin/src/main.ts`:

```ts
this.addCommand({
  id: "publish-current-note",
  name: "Publish current note",
  callback: () => this.publishCurrentNote()
});

this.addCommand({
  id: "publish-all-marked-notes",
  name: "Publish all marked notes",
  callback: () => this.publishAllMarkedNotes()
});

this.addCommand({
  id: "unpublish-current-note",
  name: "Unpublish current note",
  callback: () => this.unpublishCurrentNote()
});

this.addCommand({
  id: "copy-public-url",
  name: "Copy public URL",
  callback: () => this.copyPublicUrl()
});

this.addCommand({
  id: "open-public-url",
  name: "Open public URL",
  callback: () => this.openPublicUrl()
});
```

- [ ] **Step 6: Add command helper methods**

Add these imports to `plugin/src/main.ts`:

```ts
import matter from "gray-matter";
import { generateSlug } from "./core/slug";
import { publishCurrentNote, unpublishNote } from "./publisher";
```

Add these methods to `AstroPublisherPlugin`:

```ts
  private createGitHubClient(): GitHubContentsClient {
    return new GitHubContentsClient({
      owner: this.settings.githubOwner,
      repo: this.settings.githubRepo,
      branch: this.settings.githubBranch,
      token: this.settings.githubToken
    });
  }

  private resolvePublicUrl(slug: string): string {
    return `${this.settings.siteBaseUrl.replace(/\/$/, "")}/notes/${slug}`;
  }

  private async resolveSlugFromActiveNote(): Promise<string | null> {
    const adapter = new ObsidianPublisherAdapter(this.app);
    const file = adapter.getActiveMarkdownFile();
    if (!file) {
      new Notice("Open a Markdown note first.");
      return null;
    }

    const note = await adapter.readActiveNote(file);
    const parsed = matter(note.markdown);
    return typeof parsed.data.slug === "string" && parsed.data.slug.trim()
      ? parsed.data.slug.trim()
      : generateSlug(note.basename);
  }

  private async unpublishCurrentNote(): Promise<void> {
    try {
      const slug = await this.resolveSlugFromActiveNote();
      if (!slug) {
        return;
      }

      if (this.settings.confirmBeforeUnpublish) {
        const confirmed = window.confirm(`Unpublish ${this.resolvePublicUrl(slug)}?`);
        if (!confirmed) {
          return;
        }
      }

      const result = await unpublishNote({
        slug,
        settings: this.settings,
        github: this.createGitHubClient(),
        deleteAssets: true
      });

      new Notice(
        result.status === "already-unpublished"
          ? `Already unpublished: ${slug}`
          : `Unpublished: ${slug}`
      );
    } catch (error) {
      new Notice(formatFailureNotice(error));
    }
  }

  private async copyPublicUrl(): Promise<void> {
    const slug = await this.resolveSlugFromActiveNote();
    if (!slug) {
      return;
    }

    const publicUrl = this.resolvePublicUrl(slug);
    await navigator.clipboard.writeText(publicUrl);
    new Notice(`Copied: ${publicUrl}`);
  }

  private async openPublicUrl(): Promise<void> {
    const slug = await this.resolveSlugFromActiveNote();
    if (!slug) {
      return;
    }

    window.open(this.resolvePublicUrl(slug), "_blank");
  }

  private async publishAllMarkedNotes(): Promise<void> {
    const adapter = new ObsidianPublisherAdapter(this.app);
    const github = this.createGitHubClient();
    let published = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of adapter.getMarkdownFiles()) {
      try {
        const note = await adapter.readNoteFile(file);
        const parsed = matter(note.markdown);
        if (parsed.data.publish !== true) {
          skipped += 1;
          continue;
        }

        // Batch publish is itself the explicit user action, so it auto-approves
        // the per-note manifest instead of stacking one modal per note. The
        // pre-publish safety (slug-collision check, unsupported-embed rejection)
        // still runs inside publishCurrentNote.
        await publishCurrentNote({
          note,
          settings: this.settings,
          github,
          adapter: this.buildPublisherAdapter(adapter, async () => true)
        });
        published += 1;
      } catch {
        failed += 1;
      }
    }

    new Notice(`Published: ${published}\nSkipped: ${skipped}\nFailed: ${failed}`);
  }
```

- [ ] **Step 7: Verify commands**

Run: `npm run plugin:test`

Expected: PASS.

Run: `npm run plugin:build`

Expected: PASS.

- [ ] **Step 8: Commit command completion**

```bash
git add plugin/src
git commit -m "feat: add publisher utility commands"
```

---

### Task 10: Final Documentation and End-to-End Verification

**Files:**
- Modify: `README.md`
- Modify: `plugin/manifest.json`
- Modify: `docs/superpowers/spec.md` only if implementation reveals a spec correction

- [ ] **Step 1: Document manual plugin installation**

Append to `README.md`:

```md
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
```

- [ ] **Step 2: Verify full MVP locally**

Run: `npm run verify`

Expected: PASS for site tests, Astro build, plugin tests, and plugin build.

- [ ] **Step 3: Verify built public note output**

Run: `test -f dist/notes/example-note/index.html`

Expected: exits `0`.

Run: `test -f plugin/main.js`

Expected: exits `0`.

- [ ] **Step 4: Commit final docs**

```bash
git add README.md plugin/manifest.json docs/superpowers/spec.md
git commit -m "docs: document publisher setup and verification"
```

---

## Self-Review Checklist

- Spec coverage: Tasks 1-4 cover the Astro site, content schema, root `content/notes`, GitHub Pages workflow, and custom domain. Tasks 5-9 cover plugin settings, current-note publishing, publish-all marked notes, slug/source identity, Markdown transformation, assets, GitHub Contents API SHA behavior, unpublish, copy/open URL commands, and privacy manifest. Task 10 covers manual install and final verification.
- Public repo privacy: The plugin never uploads the vault; it writes only `content/notes/:slug.md` and `public/assets/notes/:slug/:filename`.
- Slug collision safety: Task 8 compares existing public frontmatter `source_id` before update.
- Asset safety: Task 6 rejects unsupported embeds and validates duplicate asset names. Task 8 uploads assets before Markdown.
- GitHub delete safety: Task 9 deletes Markdown and assets through per-file SHA calls. `unpublishNote` returns a result so the UI distinguishes "unpublished" from "already unpublished" (spec 11.4).
- Publish-all behavior: Task 9 iterates Markdown files, publishes only notes with `publish: true`, and reports published, skipped, and failed counts.
- Wiki-link fidelity: `listPublishedNotes` (Task 8 adapter) builds a real basename→slug map from `publish: true` vault notes, so published links become real links and only unpublished targets degrade to plain text (spec 10.2/10.3).
- Manifest confirmation: single-note publish routes `confirm` through `PublishManifestModal`, honoring `requirePublishManifestConfirmation` (spec 17.1). Batch publish intentionally auto-approves the manifest because the batch command is itself the explicit user action.
- Identity persistence: `writeFrontmatter` (Task 8 adapter) persists the generated `source_id`/`slug` back to the local note when `updateLocalFrontmatterAfterPublish` is on, keeping update identity stable (spec 7.4).
- GitHub path encoding: `GitHubContentsClient` encodes each path segment and rejoins with literal slashes, so nested paths and filenames with spaces address the correct API resource.
- Settings coverage: the settings tab renders all 13 fields from `AstroPublisherSettings` (spec 9).

## Decisions Locked During Review

- Batch publish (`publish-all-marked-notes`) skips the per-note manifest modal to avoid stacking N dialogs; per-note safety checks (slug collision, unsupported embeds) still run. Revisit if a batch-level manifest preview is wanted (relates to spec 22 open decision 4).
- The supported-asset extension allowlist lives only in `plugin/src/core/markdown.ts`; `assets.ts` keeps just collision validation to avoid a duplicated regex drifting out of sync.
