import { describe, expect, it } from "vitest";
import { buildPublishManifestText } from "../core/manifest";
import { normalizeFrontmatter } from "../core/frontmatter";
import { collectEmbeds, transformObsidianMarkdown } from "../core/markdown";
import { generateSlug, isValidSlug } from "../core/slug";
import { deriveSourceId } from "../core/identity";
import { formatLocalDate } from "../core/dates";

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

  it("preserves created_at supplied as a YAML Date object", () => {
    // Obsidian writes unquoted dates, which js-yaml/gray-matter parse into
    // Date objects rather than strings. created_at must survive that.
    const normalized = normalizeFrontmatter(
      { title: "How I Read Books", publish: true, created_at: new Date("2025-01-15T00:00:00.000Z") },
      { generatedSlug: "how-i-read-books", generatedSourceId: "obsidian-123", defaultLanguage: "en", today: "2026-07-01" }
    );

    expect(normalized.created_at).toBe("2025-01-15");
    expect(normalized.updated_at).toBe("2026-07-01");
  });

  it("falls back to today when created_at is absent or unparseable", () => {
    const normalized = normalizeFrontmatter(
      { title: "How I Read Books", publish: true, created_at: 12345 },
      { generatedSlug: "how-i-read-books", generatedSourceId: "obsidian-123", defaultLanguage: "en", today: "2026-07-01" }
    );

    expect(normalized.created_at).toBe("2026-07-01");
  });

  const baseOpts = { generatedSlug: "t", generatedSourceId: "id", defaultLanguage: "en" as const, today: "2026-07-01" };

  it("parses tags written as a comma-separated YAML scalar string", () => {
    const normalized = normalizeFrontmatter({ title: "T", tags: "productivity, obsidian" }, baseOpts);
    expect(normalized.tags).toEqual(["productivity", "obsidian"]);
  });

  it("wraps a single scalar tag and coerces non-string array entries", () => {
    expect(normalizeFrontmatter({ title: "T", tags: "solo" }, baseOpts).tags).toEqual(["solo"]);
    expect(normalizeFrontmatter({ title: "T", tags: [1, "a", { x: 1 }] }, baseOpts).tags).toEqual(["1", "a"]);
  });

  it("coerces a numeric description to a string instead of dropping it", () => {
    expect(normalizeFrontmatter({ title: "T", description: 2026 }, baseOpts).description).toBe("2026");
  });
});

describe("source id core", () => {
  it("is deterministic for the same note path", () => {
    expect(deriveSourceId("Essays/How I Read Books.md")).toBe(deriveSourceId("Essays/How I Read Books.md"));
  });

  it("differs for different note paths", () => {
    expect(deriveSourceId("Essays/How I Read Books.md")).not.toBe(deriveSourceId("Essays/Other Note.md"));
  });

  it("does not reveal the vault path and has the obsidian prefix", () => {
    const id = deriveSourceId("Private/Secret Folder/Note.md");
    expect(id).toMatch(/^obsidian-[0-9a-z]+$/);
    expect(id).not.toContain("Secret");
    expect(id).not.toContain("/");
  });
});

describe("local date core", () => {
  it("formats a date as YYYY-MM-DD using local calendar fields", () => {
    expect(formatLocalDate(new Date(2026, 5, 30, 23, 30, 0))).toBe("2026-06-30");
  });

  it("zero-pads single-digit months and days", () => {
    expect(formatLocalDate(new Date(2026, 0, 5, 1, 0, 0))).toBe("2026-01-05");
  });
});

describe("markdown core", () => {
  const published = new Map([["How I Read Books", "how-i-read-books"]]);

  it("rewrites published wiki links and plain-texts unpublished links", () => {
    expect(transformObsidianMarkdown("See [[How I Read Books]] and [[Private Note]].", { publishedNotes: published, slug: "current" }).markdown).toBe(
      "See [How I Read Books](/how-i-read-books) and Private Note."
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

  it("does not rewrite wiki syntax inside fenced or inline code", () => {
    const fenced = "```\n![[diagram.png]] and [[How I Read Books]]\n```";
    const out = transformObsidianMarkdown(fenced, { publishedNotes: published, slug: "current" });
    expect(out.markdown).toBe(fenced);
    expect(out.assetReferences).toEqual([]);

    expect(transformObsidianMarkdown("Use `[[How I Read Books]]` syntax.", { publishedNotes: published, slug: "current" }).markdown).toBe(
      "Use `[[How I Read Books]]` syntax."
    );
  });

  it("renders a note transclusion as a link instead of aborting", () => {
    expect(transformObsidianMarkdown("![[How I Read Books]]", { publishedNotes: published, slug: "current" }).markdown).toBe(
      "[How I Read Books](/how-i-read-books)"
    );
    expect(transformObsidianMarkdown("![[Private Note]]", { publishedNotes: published, slug: "current" }).markdown).toBe("Private Note");
  });

  it("resolves heading/block anchors and is case-insensitive", () => {
    expect(transformObsidianMarkdown("[[How I Read Books#Conclusion]]", { publishedNotes: published, slug: "current" }).markdown).toBe(
      "[How I Read Books#Conclusion](/how-i-read-books#conclusion)"
    );
    expect(transformObsidianMarkdown("[[how i read books]]", { publishedNotes: published, slug: "current" }).markdown).toBe(
      "[how i read books](/how-i-read-books)"
    );
  });

  it("url-encodes asset filenames with spaces and parentheses", () => {
    expect(transformObsidianMarkdown("![[my cover (final).png|Cover]]", { publishedNotes: published, slug: "s" }).markdown).toBe(
      "![Cover](/assets/notes/s/my%20cover%20%28final%29.png)"
    );
  });

  it("rejects embedded asset paths that try to traverse out of the slug folder", () => {
    expect(() => transformObsidianMarkdown("![[../secret.png]]", { publishedNotes: published, slug: "s" })).toThrow(/not allowed/);
  });
});

describe("manifest core", () => {
  it("renders the files that will become public", () => {
    const text = buildPublishManifestText({
      localNotePath: "Essays/How I Read Books.md",
      destinationNotePath: "content/notes/how-i-read-books.md",
      publicUrl: "https://notes.duongdao.family/how-i-read-books",
      assets: ["public/assets/notes/how-i-read-books/cover.png"]
    });
    expect(text).toContain("public/assets/notes/how-i-read-books/cover.png");
    expect(text).toContain("Local note: Essays/How I Read Books.md");
    expect(text).toContain("Destination note: content/notes/how-i-read-books.md");
    expect(text).toContain("Public URL: https://notes.duongdao.family/how-i-read-books");
    expect(text).toContain("Assets:");
    expect(text).toContain("- public/assets/notes/how-i-read-books/cover.png");
  });

  it("renders no-assets placeholder when assets list is empty", () => {
    const text = buildPublishManifestText({
      localNotePath: "Essays/How I Read Books.md",
      destinationNotePath: "content/notes/how-i-read-books.md",
      publicUrl: "https://notes.duongdao.family/how-i-read-books",
      assets: []
    });
    expect(text).toContain("- No assets");
  });
});
