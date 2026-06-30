import { App, TFile } from "obsidian";
import { generateSlug } from "./core/slug";

export class ObsidianPublisherAdapter {
  constructor(private readonly app: App) {}

  getActiveMarkdownFile(): TFile | null {
    const file = this.app.workspace.getActiveFile();
    return file?.extension === "md" ? file : null;
  }

  async readActiveNote(file: TFile): Promise<{ path: string; basename: string; markdown: string }> {
    return {
      path: file.path,
      basename: file.basename,
      markdown: await this.app.vault.read(file)
    };
  }

  async readBinaryAsset(filename: string): Promise<ArrayBuffer> {
    const file = this.app.metadataCache.getFirstLinkpathDest(filename, "");
    if (!file) {
      throw new Error(`Cannot publish this note because the embedded file "${filename}" was not found in the vault.`);
    }
    return this.app.vault.readBinary(file);
  }

  // Maps each published note's link target (its basename, the text used in
  // [[wiki links]]) to its public slug. transformObsidianMarkdown uses this to
  // decide whether a wiki link becomes a real link or safe plain text.
  async listPublishedNotes(): Promise<Map<string, string>> {
    const published = new Map<string, string>();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (frontmatter?.publish !== true) {
        continue;
      }
      const slug =
        typeof frontmatter.slug === "string" && frontmatter.slug.trim()
          ? frontmatter.slug.trim()
          : generateSlug(file.basename);
      published.set(file.basename, slug);
    }
    return published;
  }

  // Persists the generated/normalized fields (notably source_id and slug) back
  // into the local note so identity stays stable across future publishes.
  async writeFrontmatter(path: string, frontmatter: Record<string, unknown>): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      return;
    }
    await this.app.fileManager.processFrontMatter(file, (existing) => {
      for (const [key, value] of Object.entries(frontmatter)) {
        if (value === undefined) {
          continue;
        }
        existing[key] = value;
      }
    });
  }

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  generateSourceId(): string {
    return `obsidian-${crypto.randomUUID()}`;
  }
}
