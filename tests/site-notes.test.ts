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
