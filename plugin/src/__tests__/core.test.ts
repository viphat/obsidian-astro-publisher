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
    const text = buildPublishManifestText({
      localNotePath: "Essays/How I Read Books.md",
      destinationNotePath: "content/notes/how-i-read-books.md",
      publicUrl: "https://notes.duongdao.family/notes/how-i-read-books",
      assets: ["public/assets/notes/how-i-read-books/cover.png"]
    });
    expect(text).toContain("public/assets/notes/how-i-read-books/cover.png");
    expect(text).toContain("Local note: Essays/How I Read Books.md");
    expect(text).toContain("Destination note: content/notes/how-i-read-books.md");
    expect(text).toContain("Public URL: https://notes.duongdao.family/notes/how-i-read-books");
    expect(text).toContain("Assets:");
    expect(text).toContain("- public/assets/notes/how-i-read-books/cover.png");
  });

  it("renders no-assets placeholder when assets list is empty", () => {
    const text = buildPublishManifestText({
      localNotePath: "Essays/How I Read Books.md",
      destinationNotePath: "content/notes/how-i-read-books.md",
      publicUrl: "https://notes.duongdao.family/notes/how-i-read-books",
      assets: []
    });
    expect(text).toContain("- No assets");
  });
});
