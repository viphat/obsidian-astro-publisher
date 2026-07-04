import { describe, expect, it } from "vitest";
import { estimateReadingMinutes } from "../src/lib/readingTime";

describe("estimateReadingMinutes", () => {
  it("returns 1 for an empty string", () => {
    expect(estimateReadingMinutes("")).toBe(1);
  });

  it("returns 1 for a short text of a few words", () => {
    expect(estimateReadingMinutes("just a few words here")).toBe(1);
  });

  it("returns 2 for roughly 400 words", () => {
    const words = new Array(400).fill("word").join(" ");
    expect(estimateReadingMinutes(words)).toBe(2);
  });

  it("excludes fenced code blocks from the word count", () => {
    const prose = new Array(200).fill("word").join(" ");
    const hugeCodeFence = "```\n" + new Array(5000).fill("code").join(" ") + "\n```";
    expect(estimateReadingMinutes(`${prose}\n\n${hugeCodeFence}`)).toBe(1);
  });
});
