import { describe, expect, it } from "vitest";
import { getPublicPathForSlug, getTagPath, isSafeSlug, slugifyTag } from "../src/lib/slug";
import { getPublicNotes, getTagGroups, getUniqueSortedTags, sortNotesNewestFirst } from "../src/lib/notes";

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
    expect(getPublicPathForSlug("how-i-read-books")).toBe("/how-i-read-books");
  });

  it("throws on an invalid slug", () => {
    expect(() => getPublicPathForSlug("Bad Slug")).toThrow();
  });

  it("slugifies tags into URL-safe segments", () => {
    expect(slugifyTag("Machine Learning")).toBe("machine-learning");
    expect(slugifyTag("parent/child")).toBe("parent-child");
    expect(slugifyTag("Tôi")).toBe("toi");
    expect(slugifyTag("中文")).toBe("中文");
    expect(slugifyTag("中文 / 学习")).toBe("中文-学习");
    expect(getTagPath("Machine Learning")).toBe("/tags/machine-learning");
    expect(getTagPath("中文")).toBe("/tags/中文");
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

  it("excludes non-public notes (publish:false or draft:true)", () => {
    const mixed = [
      { data: { title: "Public", updated_at: "2026-01-01" } },
      { data: { title: "Unpublished", updated_at: "2026-01-02", publish: false } },
      { data: { title: "Draft", updated_at: "2026-01-03", draft: true } }
    ];
    expect(getPublicNotes(mixed).map((note) => note.data.title)).toEqual(["Public"]);
  });

  it("groups notes by URL-safe tag slug, preserving a display label and deduping", () => {
    const tagged = [
      { data: { title: "A", updated_at: "2026-01-01", tags: ["Machine Learning", "machine learning"] } },
      { data: { title: "B", updated_at: "2026-01-02", tags: ["Writing"] } }
    ];
    const groups = getTagGroups(tagged);
    const ml = groups.find((group) => group.slug === "machine-learning");
    expect(ml?.label).toBe("Machine Learning");
    expect(ml?.notes.map((note) => note.data.title)).toEqual(["A"]);
    expect(groups.map((group) => group.slug)).toEqual(["machine-learning", "writing"]);
  });

  it("groups Chinese-only tags into readable route slugs", () => {
    const tagged = [
      { data: { title: "A", updated_at: "2026-01-01", tags: ["中文"] } },
      { data: { title: "B", updated_at: "2026-01-02", tags: ["中文", "学习"] } }
    ];

    const groups = getTagGroups(tagged);
    const chinese = groups.find((group) => group.slug === "中文");
    const study = groups.find((group) => group.slug === "学习");

    expect(chinese).toMatchObject({ label: "中文" });
    expect(chinese?.notes).toEqual([tagged[0], tagged[1]]);
    expect(study).toMatchObject({ label: "学习" });
    expect(study?.notes).toEqual([tagged[1]]);
  });
});
