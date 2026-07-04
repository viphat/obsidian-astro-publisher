const FENCED_CODE_BLOCK = /```[\s\S]*?```/g;
const WORDS_PER_MINUTE = 200;

// Callers pass `note.body` (Astro has already stripped frontmatter), so this
// only needs to strip fenced code before counting words. Splitting on
// whitespace is a deliberate soft estimate — it undercounts CJK text, but
// current content is Vietnamese/English.
export function estimateReadingMinutes(markdown: string): number {
  const prose = markdown.replace(FENCED_CODE_BLOCK, "");
  const words = prose.split(/\s+/).filter((word) => word.length > 0);
  return Math.max(1, Math.round(words.length / WORDS_PER_MINUTE));
}
