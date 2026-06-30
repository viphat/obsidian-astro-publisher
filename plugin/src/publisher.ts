import matter from "gray-matter";
import type { AstroPublisherSettings } from "./settings";
import { normalizeFrontmatter } from "./core/frontmatter";
import { assertNoAssetNameCollisions } from "./core/assets";
import { generateSlug } from "./core/slug";
import { buildPublishManifestText } from "./core/manifest";
import { transformObsidianMarkdown } from "./core/markdown";

export type ActiveNote = {
  path: string;
  basename: string;
  markdown: string;
};

export type PublisherGitHub = {
  getFile(path: string): Promise<{ sha: string; content?: string } | null>;
  putFile(input: { path: string; content: string | ArrayBuffer; message: string; sha?: string }): Promise<void>;
};

export type PublisherAdapter = {
  readBinaryAsset(filename: string): Promise<ArrayBuffer>;
  writeFrontmatter(path: string, frontmatter: Record<string, unknown>): Promise<void>;
  listPublishedNotes(): Promise<Map<string, string>>;
  confirm(message: string): Promise<boolean>;
  today(): string;
  generateSourceId(): string;
};

export type PublishCurrentNoteInput = {
  note: ActiveNote;
  settings: AstroPublisherSettings;
  github: PublisherGitHub;
  adapter: PublisherAdapter;
};

export async function publishCurrentNote(input: PublishCurrentNoteInput): Promise<string> {
  const parsed = matter(input.note.markdown);
  const generatedSlug = generateSlug(input.note.basename);
  const frontmatter = normalizeFrontmatter(parsed.data, {
    generatedSlug,
    generatedSourceId: input.adapter.generateSourceId(),
    defaultLanguage: input.settings.defaultLanguage,
    today: input.adapter.today()
  });

  if (!frontmatter.publish && input.settings.confirmBeforePublishIfPublishFalse) {
    const allowed = await input.adapter.confirm("This note is not marked with publish: true. Publishing will make it public on the internet. Continue?");
    if (!allowed) {
      throw new Error("Publish cancelled.");
    }
  }

  const destinationNotePath = `${input.settings.notesDirectory}/${frontmatter.slug}.md`;
  const existing = await input.github.getFile(destinationNotePath);
  if (existing?.content) {
    const existingMarkdown = Buffer.from(existing.content, "base64").toString("utf8");
    const existingMatter = matter(existingMarkdown);
    if (existingMatter.data.source_id && existingMatter.data.source_id !== frontmatter.source_id) {
      throw new Error(`Cannot publish because slug "${frontmatter.slug}" already belongs to a different source_id.`);
    }
  }

  const publishedNotes = await input.adapter.listPublishedNotes();
  const transformed = transformObsidianMarkdown(parsed.content, { publishedNotes, slug: frontmatter.slug });
  assertNoAssetNameCollisions(transformed.assetReferences);

  const assetDestinations = transformed.assetReferences.map((asset) => `${input.settings.assetsDirectory}/${frontmatter.slug}/${asset}`);
  const publicUrl = `${input.settings.siteBaseUrl.replace(/\/$/, "")}/notes/${frontmatter.slug}`;
  const manifestText = buildPublishManifestText({
    localNotePath: input.note.path,
    destinationNotePath,
    publicUrl,
    assets: assetDestinations
  });

  if (input.settings.requirePublishManifestConfirmation) {
    const allowed = await input.adapter.confirm(manifestText);
    if (!allowed) {
      throw new Error("Publish cancelled.");
    }
  }

  for (let index = 0; index < transformed.assetReferences.length; index += 1) {
    const asset = transformed.assetReferences[index];
    await input.github.putFile({
      path: assetDestinations[index],
      content: await input.adapter.readBinaryAsset(asset),
      message: `Upload asset: ${frontmatter.slug}/${asset}`
    });
  }

  const serializable = Object.fromEntries(
    Object.entries(frontmatter).filter(([, v]) => v !== undefined)
  );
  const publicMarkdown = matter.stringify(transformed.markdown, serializable);
  await input.github.putFile({
    path: destinationNotePath,
    content: publicMarkdown,
    message: existing ? `Update note: ${frontmatter.slug}` : `Publish note: ${frontmatter.slug}`,
    sha: existing?.sha
  });

  if (input.settings.updateLocalFrontmatterAfterPublish) {
    await input.adapter.writeFrontmatter(input.note.path, frontmatter);
  }

  return publicUrl;
}

export type UnpublishInput = {
  slug: string;
  settings: AstroPublisherSettings;
  github: {
    getFile(path: string): Promise<{ sha: string } | null>;
    listDirectory(path: string): Promise<Array<{ path: string; sha: string }>>;
    deleteFile(input: { path: string; sha: string; message: string }): Promise<void>;
  };
  deleteAssets: boolean;
};

export type UnpublishResult = {
  status: "unpublished" | "already-unpublished";
  deletedAssets: number;
};

export async function unpublishNote(input: UnpublishInput): Promise<UnpublishResult> {
  const notePath = `${input.settings.notesDirectory}/${input.slug}.md`;
  const existingNote = await input.github.getFile(notePath);

  // A missing Markdown file is treated as "already unpublished" (spec 11.4),
  // not an error, so the caller can show a clear notice.
  if (!existingNote) {
    return { status: "already-unpublished", deletedAssets: 0 };
  }

  await input.github.deleteFile({
    path: notePath,
    sha: existingNote.sha,
    message: `Unpublish note: ${input.slug}`
  });

  if (!input.deleteAssets) {
    return { status: "unpublished", deletedAssets: 0 };
  }

  const assetDirectory = `${input.settings.assetsDirectory}/${input.slug}`;
  const assets = await input.github.listDirectory(assetDirectory);

  for (const asset of assets) {
    await input.github.deleteFile({
      path: asset.path,
      sha: asset.sha,
      message: `Unpublish asset: ${input.slug}/${asset.path.split("/").pop() ?? "asset"}`
    });
  }

  return { status: "unpublished", deletedAssets: assets.length };
}
