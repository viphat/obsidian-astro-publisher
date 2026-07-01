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

  return {
    title,
    slug,
    source_id: sourceId,
    publish: input.publish === true,
    draft: input.draft === true,
    description: coerceOptionalString(input.description),
    tags: normalizeTags(input.tags),
    language: isSupportedLanguage(input.language) ? input.language : options.defaultLanguage,
    created_at: coerceDateString(input.created_at, options.today),
    updated_at: options.today,
    source: "obsidian",
    cover_image: coerceOptionalString(input.cover_image),
    canonical_url: coerceOptionalString(input.canonical_url),
    obsidian_path: options.includeObsidianPath
  };
}

// Obsidian authors commonly write `tags: a, b` (a YAML scalar string) or a
// single scalar instead of a YAML list. gray-matter parses those as a string /
// number, which the old Array.isArray-only check silently dropped. Accept both
// shapes and coerce non-string scalar entries instead of discarding them.
function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((tag) => tag !== null && tag !== undefined && typeof tag !== "object")
      .map((tag) => String(tag).trim())
      .filter((tag) => tag.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  return [];
}

// Optional display fields: keep strings, coerce scalar numbers/booleans/dates to
// a string rather than silently dropping author-provided values.
function coerceOptionalString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return undefined;
}

function isSupportedLanguage(value: unknown): value is PublicFrontmatter["language"] {
  return value === "en" || value === "vi" || value === "zh" || value === "ja";
}

// Obsidian writes unquoted frontmatter dates, which gray-matter/js-yaml parse
// into Date objects rather than strings. Coerce both shapes to a YYYY-MM-DD
// string so an existing created_at is preserved instead of silently reset.
function coerceDateString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return fallback;
}
