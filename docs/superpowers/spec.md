# Obsidian → Astro → GitHub Pages Publisher

## 1. Summary

Build a small publishing system that allows the user to publish selected Obsidian notes to a public Astro-based static website hosted for free on GitHub Pages.

The MVP focuses on Obsidian as the authoring source, GitHub as the content transport and build trigger, Astro as the static site generator, and GitHub Pages as the default hosting target.

Notion support is intentionally deferred to Version 2.

Target public URL format:

```txt
https://notes.duongdao.family/notes/:slug
```

Example:

```txt
https://notes.duongdao.family/notes/how-i-read-books
```

---

## 2. Goals

### 2.1 Product goals

- Publish one selected Obsidian note to the internet with a stable public URL.
- Keep the user's private Obsidian vault private.
- Publish only explicitly selected notes.
- Use a static website for low cost, high reliability, and simple maintenance.
- Use GitHub Pages as the default free hosting option.
- Use Astro instead of Quartz for better control over routing, UI, SEO, and future productization.
- Keep the architecture extensible so Notion can be added in Version 2.

### 2.2 Developer goals

- Make the MVP simple enough to build and maintain by one developer.
- Use TypeScript for both the Obsidian plugin and the Astro site.
- Avoid server-side infrastructure in Version 1.
- Avoid storing the entire Obsidian vault in a public repository.
- Keep the public publishing repository clean and deterministic.
- Allow future migration to Cloudflare Pages or Netlify without changing the publishing plugin too much.

---

## 3. Non-goals for Version 1

The following are explicitly out of scope for the MVP:

- Full Obsidian vault publishing.
- Real-time sync.
- Collaborative editing.
- Paid membership or private-note access control.
- Comment system.
- Newsletter delivery.
- Search indexing beyond simple static search or no search.
- Notion publishing.
- WYSIWYG editing in the web app.
- Complex backlink graph visualization.
- Multi-user SaaS backend.
- Database-backed application server.

---

## 4. Version plan

## 4.1 Version 1: Obsidian + Astro + GitHub Pages

Version 1 publishes selected Obsidian Markdown notes to a public Astro static site.

Core flow:

```txt
Obsidian note
  → Obsidian plugin command
  → GitHub Contents API
  → Public publishing repo
  → GitHub Actions build
  → Astro static site
  → GitHub Pages
  → Public URL
```

## 4.2 Version 2: Notion support

Version 2 adds Notion as an additional content source.

Possible Version 2 flow:

```txt
Notion page or database item
  → Notion API
  → Markdown normalization
  → Same publishing repository format
  → Astro build
  → Static hosting
```

Notion should reuse the same public content schema as Obsidian:

```txt
content/notes/:slug.md
public/assets/notes/:slug/*
```

This keeps Astro mostly unchanged when Notion support is added.

---

## 5. High-level architecture

```txt
┌────────────────────┐
│  Obsidian Vault     │
│  private Markdown   │
└─────────┬──────────┘
          │
          │ Publish selected note
          ▼
┌────────────────────┐
│  Obsidian Plugin    │
│  TypeScript         │
└─────────┬──────────┘
          │
          │ GitHub REST API
          ▼
┌────────────────────┐
│  GitHub Repo        │
│  public site repo   │
└─────────┬──────────┘
          │
          │ GitHub Actions
          ▼
┌────────────────────┐
│  Astro Build        │
│  static HTML/CSS/JS │
└─────────┬──────────┘
          │
          │ Deploy
          ▼
┌────────────────────┐
│  GitHub Pages       │
│  notes.duongdao...  │
└────────────────────┘
```

---

## 6. Repository design

Use a dedicated public publishing repository.

Recommended repository name:

```txt
notes-site
```

Recommended structure:

```txt
notes-site/
  astro.config.mjs
  package.json
  tsconfig.json
  README.md

  src/
    content/
      config.ts
    layouts/
      NoteLayout.astro
    pages/
      index.astro
      notes/
        [slug].astro
      tags/
        [tag].astro
    components/
      NoteCard.astro
      NoteMeta.astro
      BacklinkList.astro
      Seo.astro
    lib/
      slug.ts
      notes.ts
      links.ts

  content/
    notes/
      example-note.md

  public/
    assets/
      notes/
        example-note/
          image.png

  .github/
    workflows/
      deploy.yml
```

The root-level `content/notes` directory is intentional. The Astro site must configure this directory explicitly with a content collection loader instead of relying on Astro's default `src/content` layout.

### 6.1 Private source vault vs public publishing repo

The user's Obsidian vault remains private and local.

Only exported/published notes are committed to the public publishing repository.

```txt
Private Obsidian vault
  /Daily Notes/private.md
  /Ideas/publishable-note.md
  /Family/private.md

Public GitHub repo
  /content/notes/publishable-note.md
  /public/assets/notes/publishable-note/image.png
```

This prevents accidental exposure of private notes.

---

## 7. Content model

Each published note is a Markdown file under:

```txt
content/notes/:slug.md
```

Example:

```txt
content/notes/how-i-read-books.md
```

### 7.1 Required frontmatter

```yaml
title: "How I Read Books"
slug: "how-i-read-books"
source_id: "obsidian-9f5b0f3c-2d4a-4b9b-8d2e-0e1c3a7f2c91"
publish: true
created_at: "2026-06-30"
updated_at: "2026-06-30"
```

`source_id` is generated once by the plugin on first publish and stays stable for that local note. It must not expose the vault path or any private folder names. A random UUID-based value is preferred.

### 7.2 Optional frontmatter

```yaml
description: "A practical note about reading deeply instead of reading many books."
tags:
  - reading
  - learning
  - personal-knowledge-management
language: "en"
canonical_url: ""
cover_image: "/assets/notes/how-i-read-books/cover.png"
draft: false
source: "obsidian"
obsidian_path: "Essays/How I Read Books.md"
```

`obsidian_path` is optional debugging metadata. It should be omitted by default because it is visible in the public repository when published.

### 7.3 Final normalized frontmatter example

```yaml
title: "How I Read Books"
slug: "how-i-read-books"
source_id: "obsidian-9f5b0f3c-2d4a-4b9b-8d2e-0e1c3a7f2c91"
publish: true
draft: false
description: "A practical note about reading deeply instead of reading many books."
tags:
  - reading
  - learning
language: "en"
created_at: "2026-06-30"
updated_at: "2026-06-30"
source: "obsidian"
cover_image: "/assets/notes/how-i-read-books/cover.png"
```

### 7.4 Slug rules

A slug must:

- Be lowercase.
- Use hyphens between words.
- Avoid spaces.
- Avoid Vietnamese/Chinese/Japanese characters in Version 1 URLs unless explicitly allowed later.
- Stay stable after publishing.
- Be unique across all notes.

If the target slug already exists in the publishing repository, the plugin must compare the existing note's `source_id` with the local note's `source_id` before updating. If the IDs differ, the publish must fail with a slug collision error instead of overwriting the existing note.

Example slug conversion:

```txt
"Tôi đã đọc sách như thế nào" → "toi-da-doc-sach-nhu-the-nao"
"Cell-based Architecture with Rails" → "cell-based-architecture-with-rails"
```

---

## 8. Obsidian plugin specification

## 8.1 Plugin name

Working name:

```txt
Astro Publisher
```

Alternative names:

```txt
Obsidian Astro Publisher
Notes to Astro
Static Notes Publisher
```

## 8.2 Plugin responsibilities

The plugin is responsible for:

- Reading the current active Obsidian note.
- Validating publish metadata.
- Generating or validating the slug.
- Generating or validating a stable `source_id`.
- Transforming Obsidian Markdown into publishable Markdown.
- Rewriting internal note links.
- Rewriting embedded image/file links.
- Showing a publish manifest before upload.
- Uploading the note to GitHub.
- Uploading required assets to GitHub.
- Optionally deleting/unpublishing a note.
- Returning the public URL to the user.

The plugin is not responsible for:

- Building the static site locally.
- Hosting the website.
- Running a backend server.
- Indexing search.
- Publishing private notes automatically.

## 8.3 Plugin commands

### Command: Publish current note

Command ID:

```txt
astro-publisher:publish-current-note
```

Behavior:

1. Read current active note.
2. Parse frontmatter.
3. If `publish` is not `true`, ask for confirmation before publishing.
4. Generate slug if missing.
5. Resolve the target GitHub path and check whether it already exists.
6. If the target file exists, validate that its `source_id` matches the local note.
7. Transform Markdown.
8. Collect referenced assets.
9. Show a pre-publish summary of the note path and all files that will become public.
10. Upload assets first, then upload Markdown last.
11. Show success notice with final URL.

Expected output:

```txt
Published: https://notes.duongdao.family/notes/how-i-read-books
```

### Command: Publish all marked notes

Command ID:

```txt
astro-publisher:publish-all-marked-notes
```

Behavior:

- Find all notes with `publish: true`.
- Publish each note.
- Skip notes with validation errors.
- Show summary.

Example summary:

```txt
Published: 12
Skipped: 2
Failed: 1
```

### Command: Unpublish current note

Command ID:

```txt
astro-publisher:unpublish-current-note
```

Behavior:

- Resolve slug.
- Fetch the current GitHub SHA for `content/notes/:slug.md`.
- Delete `content/notes/:slug.md` using that SHA.
- Optionally list and delete each file under `public/assets/notes/:slug/` using each file's SHA.
- Set local frontmatter `publish: false` if configured.

### Command: Copy public URL

Command ID:

```txt
astro-publisher:copy-public-url
```

Behavior:

- Resolve slug from current note.
- Copy public URL to clipboard.

### Command: Open public URL

Command ID:

```txt
astro-publisher:open-public-url
```

Behavior:

- Resolve slug from current note.
- Open final public URL in browser.

---

## 9. Plugin settings

The plugin settings screen should include:

```ts
type AstroPublisherSettings = {
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubToken: string;
  siteBaseUrl: string;
  notesDirectory: string;
  assetsDirectory: string;
  defaultLanguage: "en" | "vi" | "zh" | "ja";
  autoGenerateSlug: boolean;
  updateLocalFrontmatterAfterPublish: boolean;
  confirmBeforePublishIfPublishFalse: boolean;
  confirmBeforeUnpublish: boolean;
  requirePublishManifestConfirmation: boolean;
};
```

Recommended defaults:

```json
{
  "githubBranch": "main",
  "siteBaseUrl": "https://notes.duongdao.family",
  "notesDirectory": "content/notes",
  "assetsDirectory": "public/assets/notes",
  "defaultLanguage": "en",
  "autoGenerateSlug": true,
  "updateLocalFrontmatterAfterPublish": true,
  "confirmBeforePublishIfPublishFalse": true,
  "confirmBeforeUnpublish": true,
  "requirePublishManifestConfirmation": true
}
```

### 9.1 GitHub token requirements

The GitHub token should have the minimum permissions required to create, update, and delete files in the publishing repository.

Recommended approach:

- Use a fine-grained GitHub personal access token.
- Restrict it to the publishing repository only.
- Grant repository contents read/write permission.
- Do not use a token that has access to unrelated private repositories.

---

## 10. Markdown transformation rules

## 10.1 Normal Markdown

Standard Markdown should pass through unchanged.

Example:

```md
# Title

This is a paragraph.

- Item 1
- Item 2
```

## 10.2 Obsidian wiki links

Convert Obsidian wiki links to normal Markdown links.

Input:

```md
See [[How I Read Books]].
```

Output:

```md
See [How I Read Books](/notes/how-i-read-books).
```

Input:

```md
See [[How I Read Books|my reading method]].
```

Output:

```md
See [my reading method](/notes/how-i-read-books).
```

## 10.3 Unpublished internal links

If a linked note is not published, Version 1 should use one of these strategies:

Default:

```txt
Keep plain text label and remove link.
```

Example:

```md
See How I Read Books.
```

Optional later setting:

```txt
Keep broken link and show build warning.
```

## 10.4 Embedded images

Input:

```md
![[cover.png]]
```

Output:

```md
![cover](/assets/notes/how-i-read-books/cover.png)
```

Input:

```md
![[diagram.png|Architecture diagram]]
```

Output:

```md
![Architecture diagram](/assets/notes/how-i-read-books/diagram.png)
```

Embedded Obsidian transclusions that target notes, canvases, or unsupported files must not be silently published or converted. Version 1 should fail validation with a clear message unless the embed resolves to a supported asset type.

## 10.5 Callouts

Obsidian callouts should be preserved in a format Astro can render.

Input:

```md
> [!NOTE]
> This is a note.
```

Version 1 options:

1. Preserve as blockquote.
2. Transform to custom HTML.
3. Use a remark plugin.

MVP decision:

```txt
Preserve as blockquote first. Add styled callouts later.
```

## 10.6 Tags

Inline Obsidian tags may be preserved or ignored.

Input:

```md
This is about #reading and #learning.
```

MVP behavior:

- Prefer frontmatter `tags` for site taxonomy.
- Leave inline hashtags unchanged in the Markdown body.

---

## 11. GitHub integration

## 11.1 File upload strategy

Use GitHub's repository contents API to create or update files.

The plugin uploads:

```txt
content/notes/:slug.md
public/assets/notes/:slug/:asset-file
```

Each upload should create a commit.

For multi-file publishes, assets must be uploaded before the Markdown note. This prevents the public page from pointing at missing assets if GitHub Actions deploys between commits.

MVP commit message examples:

```txt
Publish note: how-i-read-books
Update note: how-i-read-books
Unpublish note: how-i-read-books
Upload asset: how-i-read-books/cover.png
```

## 11.2 Batch commit strategy

Version 1 can use one commit per file for simplicity.

Version 1.1 or later should consider using the Git Data API to create a single commit containing:

- Markdown file.
- All note assets.
- Deleted stale assets.

MVP decision:

```txt
Start with repository contents API for simplicity.
Optimize to batch commits later if needed.
```

## 11.3 Conflict handling

When updating an existing GitHub file, the GitHub API requires the current file SHA.

Plugin behavior:

1. Try to get the target file.
2. If file exists, read its SHA.
3. Update using the SHA.
4. If file does not exist, create it.
5. If conflict occurs, show a clear error and do not overwrite blindly.

## 11.4 Delete and unpublish behavior

GitHub's repository contents API requires the current file SHA when deleting a file.

Plugin behavior:

1. Fetch the target Markdown file and read its SHA.
2. Delete the Markdown file with that SHA.
3. If asset deletion is enabled, list `public/assets/notes/:slug/`.
4. Delete each asset file individually with its own SHA.
5. Treat a missing Markdown file as "already unpublished" and show a clear notice.
6. Treat missing assets as non-fatal only if the Markdown file was deleted successfully.

The plugin must not assume `public/assets/notes/:slug/*` can be deleted as a wildcard directory.

---

## 12. Astro site specification

## 12.1 Astro responsibilities

The Astro app is responsible for:

- Reading Markdown files from `content/notes`.
- Generating static note pages.
- Rendering note metadata.
- Generating tag pages.
- Generating homepage/recent notes page.
- Generating SEO metadata.
- Generating RSS feed if included in MVP.
- Generating sitemap if included in MVP.

## 12.2 Routing

Required routes:

```txt
/                         Homepage
/notes/:slug              Public note page
/tags/:tag                Tag page
```

Optional routes:

```txt
/archive                  All notes
/rss.xml                  RSS feed
/sitemap-index.xml        Sitemap
```

## 12.3 Content collection schema

Example `src/content/config.ts`:

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

## 12.4 Page generation

`src/pages/notes/[slug].astro` should:

- Load all notes from the `notes` content collection.
- Filter out `draft: true`.
- Generate paths by slug.
- Render Markdown content.
- Render title, description, tags, created date, and updated date.
- Set canonical URL.

## 12.5 SEO requirements

Each note page should include:

- `<title>`
- `<meta name="description">`
- Canonical URL.
- Open Graph title.
- Open Graph description.
- Open Graph URL.
- Open Graph image if `cover_image` exists.
- Twitter card metadata.

Default title format:

```txt
{note.title} | Duong Dao Notes
```

## 12.6 UI requirements

MVP UI should be intentionally simple:

- Clean typography.
- Responsive layout.
- Readable on mobile.
- Note title.
- Metadata row.
- Tags.
- Markdown body.
- Footer link back to homepage.

MVP does not require a complex digital garden graph.

---

## 13. GitHub Actions deployment

The repository should include a GitHub Actions workflow that builds the Astro site and deploys to GitHub Pages.

Example workflow path:

```txt
.github/workflows/deploy.yml
```

Workflow behavior:

1. Trigger on push to `main`.
2. Install dependencies.
3. Build Astro.
4. Upload GitHub Pages artifact.
5. Deploy to GitHub Pages.

Workflow requirements:

- GitHub Pages source must be set to GitHub Actions.
- The workflow must include `contents: read`, `pages: write`, and `id-token: write` permissions.
- The workflow should use one concurrency group for Pages deployments so repeated publishes do not deploy out of order.

MVP deployment target:

```txt
GitHub Pages with GitHub Actions as the publishing source.
```

---

## 14. Custom domain

Target domain:

```txt
notes.duongdao.family
```

Required setup:

1. Configure GitHub Pages custom domain for the repository.
2. Add the correct DNS record for the subdomain.
3. Enable HTTPS enforcement after DNS is verified.
4. Ensure Astro `site` config uses the final domain.

Astro config example:

```ts
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://notes.duongdao.family"
});
```

---

## 15. Asset handling

## 15.1 Supported asset types in MVP

Supported:

- `.png`
- `.jpg`
- `.jpeg`
- `.webp`
- `.gif`
- `.svg`
- `.pdf`

Not supported in MVP:

- Large videos.
- Audio files.
- Obsidian Canvas files.
- Excalidraw-specific rendering unless exported as image.

## 15.2 Asset destination

Assets for each note should be copied to:

```txt
public/assets/notes/:slug/:filename
```

Example:

```txt
public/assets/notes/how-i-read-books/cover.png
```

Public URL:

```txt
/assets/notes/how-i-read-books/cover.png
```

## 15.3 Asset collision policy

If two assets have the same filename in one note:

MVP behavior:

```txt
Fail with a clear validation error.
```

Later behavior:

```txt
Auto-rename using a deterministic suffix.
```

Example:

```txt
diagram.png
diagram-2.png
```

---

## 16. Publishing flow details

## 16.1 First-time publish

Input local note:

```md
---
title: "How I Read Books"
publish: true
tags: ["reading", "learning"]
---

# How I Read Books

This is my note.
```

Plugin actions:

1. Generate slug: `how-i-read-books`.
2. Generate stable `source_id` if missing.
3. Add missing frontmatter fields locally if configured.
4. Transform Markdown.
5. Show publish manifest for confirmation.
6. Upload assets first.
7. Upload to `content/notes/how-i-read-books.md`.
8. Show final URL.

## 16.2 Update existing note

If slug already exists:

1. Fetch existing file SHA and Markdown content from GitHub.
2. Parse existing frontmatter.
3. Confirm existing `source_id` matches the local note's `source_id`.
4. Upload assets first.
5. Upload updated content with SHA.
6. Commit update.
7. GitHub Actions rebuilds site.
8. URL remains unchanged.

## 16.3 Rename title but keep slug

If note title changes, slug should not change automatically after first publish.

Reason:

```txt
Stable URLs are more important than matching the latest title.
```

## 16.4 Change slug manually

If the user changes the slug manually:

MVP behavior:

- Publish new slug as a new note.
- Warn that the old URL may remain unless unpublished.

Later behavior:

- Add redirect support.

## 16.5 Unpublish

Unpublish means:

- Delete Markdown from `content/notes/:slug.md` using the current GitHub file SHA.
- Optionally list and delete assets from `public/assets/notes/:slug/` using each asset file's SHA.
- Optionally set local `publish: false`.

Unpublish does not delete the local Obsidian note.

---

## 17. Privacy and safety

## 17.1 Explicit publishing only

A note should only publish when:

- The user runs a publish command, and
- The note has `publish: true`, or
- The user explicitly confirms publishing a note without `publish: true`.

Before upload, the plugin should show a publish manifest that includes:

- The local note path.
- The destination Markdown path.
- Every asset that will be uploaded.
- The final public URL.

If the manifest includes unexpected files, the user can cancel before anything is committed.

## 17.2 Warning before public publish

If `publish` is missing or false, show:

```txt
This note is not marked with publish: true. Publishing will make it public on the internet. Continue?
```

## 17.3 Token storage

The GitHub token should be stored in Obsidian plugin settings.

Security note:

```txt
This is acceptable for a personal MVP but not ideal for a public SaaS product.
```

Future improvement:

- OAuth flow.
- GitHub App.
- Local OS keychain storage.

## 17.4 Public repo isolation

Do not publish directly from the private vault repo.

Use a dedicated public publishing repo.

## 17.5 Public metadata safety

Public frontmatter should not reveal private vault structure unless the user opts in.

MVP behavior:

- Use `source_id` for update identity.
- Do not require `obsidian_path` in public Markdown.
- If `obsidian_path` is enabled for debugging, warn that it will be visible in the public repository.
- Never use the full local filesystem path in public frontmatter.

---

## 18. Error handling

## 18.1 Validation errors

Examples:

- Missing title.
- Invalid slug.
- Duplicate slug.
- Missing image file.
- Unsupported attachment type.
- Unsupported Obsidian transclusion.
- Slug already belongs to a different `source_id`.
- GitHub token missing.
- GitHub repository not found.
- GitHub API permission denied.

Error messages should be clear and actionable.

Example:

```txt
Cannot publish this note because the embedded file "cover.png" was not found in the vault.
```

## 18.2 GitHub API errors

Common errors:

- `401 Unauthorized`: invalid token.
- `403 Forbidden`: insufficient permissions or rate limit.
- `404 Not Found`: repo/path not found or token cannot access it.
- `409 Conflict`: file changed remotely.

Plugin should show user-friendly messages.

## 18.3 Build errors

If GitHub upload succeeds but Astro build fails:

MVP behavior:

- Show that the note was pushed, but site deployment may fail.
- Provide link to GitHub Actions page if possible.

Later behavior:

- Poll GitHub Actions run status.
- Show deployment success/failure inside Obsidian.

---

## 19. Acceptance criteria

## 19.1 MVP acceptance criteria

The MVP is complete when:

- User can install the Obsidian plugin manually.
- User can configure GitHub owner, repo, branch, token, and site URL.
- User can publish the current note from Obsidian.
- Plugin creates or validates a stable non-revealing `source_id`.
- Published note appears in the GitHub repository under `content/notes`.
- Astro builds the note into `/notes/:slug`.
- GitHub Pages deploys the site successfully.
- User can open `https://notes.duongdao.family/notes/:slug`.
- Embedded images are published and rendered correctly.
- `[[wiki links]]` are converted to normal links or safe plain text.
- User can update an already published note without changing the URL.
- Publishing a different note with an existing slug fails instead of overwriting the existing note.
- User can unpublish a note.
- Unpublish deletes files through SHA-based GitHub API calls and does not assume wildcard directory deletes.
- The GitHub Pages workflow uses the required Pages permissions and GitHub Actions publishing source.

## 19.2 Not accepted if

- The entire private Obsidian vault is pushed to GitHub.
- Notes publish automatically without explicit user intent.
- Missing assets break the build silently.
- Unsupported embeds or transclusions publish private content silently.
- Slugs change unexpectedly after title edits.
- A slug collision overwrites a different published note.
- GitHub token requires broad access to unrelated repositories.

---

## 20. Milestones

## Milestone 1: Astro site template

Deliverables:

- Astro project.
- Markdown content collection.
- `/notes/:slug` route.
- Basic layout.
- GitHub Pages deploy workflow.
- Custom domain ready.

Estimated scope:

```txt
Can be built and tested manually without the Obsidian plugin.
```

## Milestone 2: Manual publishing contract

Deliverables:

- Final frontmatter schema.
- Stable `source_id` identity rule.
- Example notes.
- Example assets.
- Documented repo paths.
- Manual publish by adding Markdown to GitHub.

Purpose:

```txt
Prove the static site pipeline before building the plugin.
```

## Milestone 3: Obsidian plugin prototype

Deliverables:

- Plugin settings screen.
- Publish current note command.
- GitHub file create/update.
- Basic slug generation.
- Basic `source_id` generation and collision checks.
- Basic Markdown transformation.

## Milestone 4: Asset support

Deliverables:

- Detect embedded local assets.
- Upload assets to GitHub.
- Rewrite image links.
- Validate missing assets.

## Milestone 5: Update and unpublish

Deliverables:

- Update existing published note.
- Unpublish current note.
- Copy/open public URL command.

## Milestone 6: Version 1 polish

Deliverables:

- Better error messages.
- Deployment status link.
- README.
- Release build for manual Obsidian installation.
- Example demo repo.

---

## 21. Future features after MVP

Potential Version 1.x improvements:

- GitHub OAuth or GitHub App authentication.
- Single commit for note + assets.
- Build status polling.
- Draft preview deployment.
- Redirect support after slug changes.
- Static search.
- RSS feed.
- Sitemap.
- Backlinks.
- Better callout rendering.
- Better multilingual slug handling.
- Publish selected folder.
- Publish by tag.
- Cloudflare Pages deployment option.
- Netlify deployment option.

Potential Version 2 features:

- Notion page publishing.
- Notion database publishing.
- Notion property-to-frontmatter mapping.
- Notion asset download and re-hosting.
- Notion page update detection.
- Shared content pipeline for Obsidian and Notion.

---

## 22. Open decisions

The following decisions should be made before implementation:

1. Final product/plugin name.
2. Public repository name.
3. Whether the Astro site should be private during development or public from the start.
4. Whether `publish: true` is strictly required or only recommended.
5. Whether `obsidian_path` should ever be published, or kept local-only.
6. Whether unpublished internal links should become plain text or broken links.
7. Whether the first MVP includes RSS and sitemap.
8. Whether assets should be deleted automatically during unpublish.
9. Whether the plugin should modify local frontmatter after publishing.
10. Whether Vietnamese/Chinese/Japanese slugs should be transliterated or preserved.
11. Whether Cloudflare Pages should be supported immediately or only later.

---

## 23. Recommended MVP decisions

For fastest delivery, use these defaults:

```txt
Authoring source:       Obsidian
Static generator:       Astro
Hosting:                GitHub Pages
Public repo:            notes-site
Domain:                 notes.duongdao.family
Route format:           /notes/:slug
Authentication:         Fine-grained GitHub PAT
Publishing trigger:     Manual command in Obsidian
Frontmatter flag:       publish: true
Update identity:        Stable generated source_id
Slug policy:            Generate once, then keep stable
Internal links:         Convert if target is published; otherwise plain text
Assets:                 Copy to /public/assets/notes/:slug/
Publish safety:         Show manifest before upload
Notion:                 Version 2
Backend server:         None in Version 1
```

---

## 24. Reference documentation

- Astro GitHub Pages deployment: https://docs.astro.build/en/guides/deploy/github/
- GitHub Pages custom domains: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
- GitHub Pages publishing sources: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- GitHub repository contents API: https://docs.github.com/rest/repos/contents
- Obsidian developer documentation: https://docs.obsidian.md/
- Obsidian Vault API: https://docs.obsidian.md/Plugins/Vault
- Notion retrieve page as Markdown: https://developers.notion.com/reference/retrieve-page-markdown
