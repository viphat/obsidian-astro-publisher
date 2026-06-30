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
