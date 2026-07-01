import { describe, expect, it } from "vitest";
import { buildCanonicalUrl, buildNoteTitle } from "../src/lib/seo";

describe("SEO helpers", () => {
  it("builds the default note title", () => {
    expect(buildNoteTitle("How I Read Books")).toBe("How I Read Books | Dương Đào Notes");
  });

  it("builds canonical URLs without duplicate slashes", () => {
    expect(buildCanonicalUrl("https://notes.duongdao.family/", "/notes/how-i-read-books")).toBe(
      "https://notes.duongdao.family/notes/how-i-read-books"
    );
  });
});
