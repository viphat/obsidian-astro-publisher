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
