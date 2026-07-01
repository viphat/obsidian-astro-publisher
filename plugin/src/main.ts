import { Notice, Plugin } from "obsidian";
import matter from "gray-matter";
import { GitHubContentsClient } from "./github/contentsClient";
import { ObsidianPublisherAdapter } from "./obsidianAdapter";
import { publishCurrentNote, unpublishNote, type PublisherAdapter } from "./publisher";
import { AstroPublisherSettingTab, type AstroPublisherSettings, normalizeSettings } from "./settings";
import { PublishManifestModal } from "./ui/PublishManifestModal";
import { formatFailureNotice, formatPublishedNotice } from "./ui/messages";
import { generateSlug } from "./core/slug";

export default class AstroPublisherPlugin extends Plugin {
  settings: AstroPublisherSettings = normalizeSettings(null);

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new AstroPublisherSettingTab(this.app, this));

    this.addCommand({
      id: "publish-current-note",
      name: "Publish current note",
      callback: () => this.publishCurrentNote()
    });

    this.addCommand({
      id: "publish-all-marked-notes",
      name: "Publish all marked notes",
      callback: () => this.publishAllMarkedNotes()
    });

    this.addCommand({
      id: "unpublish-current-note",
      name: "Unpublish current note",
      callback: () => this.unpublishCurrentNote()
    });

    this.addCommand({
      id: "copy-public-url",
      name: "Copy public URL",
      callback: () => this.copyPublicUrl()
    });

    this.addCommand({
      id: "open-public-url",
      name: "Open public URL",
      callback: () => this.openPublicUrl()
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  // Builds the PublisherAdapter the orchestration core depends on. `confirm`
  // controls how manifests/warnings are surfaced: interactive single-note
  // publishes pass a modal-backed confirm; the batch command passes an
  // auto-approving confirm (see Task 9) so it does not stack N modals.
  private buildPublisherAdapter(
    adapter: ObsidianPublisherAdapter,
    confirm: (message: string) => Promise<boolean>
  ): PublisherAdapter {
    return {
      readBinaryAsset: (filename) => adapter.readBinaryAsset(filename),
      writeFrontmatter: (path, frontmatter) => adapter.writeFrontmatter(path, frontmatter),
      listPublishedNotes: () => adapter.listPublishedNotes(),
      confirm,
      today: () => adapter.today(),
      generateSourceId: (seed) => adapter.generateSourceId(seed)
    };
  }

  private async publishCurrentNote(): Promise<void> {
    try {
      const adapter = new ObsidianPublisherAdapter(this.app);
      const file = adapter.getActiveMarkdownFile();
      if (!file) {
        new Notice("Open a Markdown note before publishing.");
        return;
      }

      const github = new GitHubContentsClient({
        owner: this.settings.githubOwner,
        repo: this.settings.githubRepo,
        branch: this.settings.githubBranch,
        token: this.settings.githubToken
      });

      const publicUrl = await publishCurrentNote({
        note: await adapter.readActiveNote(file),
        settings: this.settings,
        github,
        adapter: this.buildPublisherAdapter(adapter, (message) =>
          new PublishManifestModal(this.app, message).openAndWait()
        )
      });

      new Notice(formatPublishedNotice(publicUrl));
    } catch (error) {
      new Notice(formatFailureNotice(error));
    }
  }

  private createGitHubClient(): GitHubContentsClient {
    return new GitHubContentsClient({
      owner: this.settings.githubOwner,
      repo: this.settings.githubRepo,
      branch: this.settings.githubBranch,
      token: this.settings.githubToken
    });
  }

  private resolvePublicUrl(slug: string): string {
    return `${this.settings.siteBaseUrl.replace(/\/$/, "")}/${slug}`;
  }

  private async resolveSlugFromActiveNote(): Promise<string | null> {
    const adapter = new ObsidianPublisherAdapter(this.app);
    const file = adapter.getActiveMarkdownFile();
    if (!file) {
      new Notice("Open a Markdown note first.");
      return null;
    }

    const note = await adapter.readActiveNote(file);
    const parsed = matter(note.markdown);
    return typeof parsed.data.slug === "string" && parsed.data.slug.trim()
      ? parsed.data.slug.trim()
      : generateSlug(note.basename);
  }

  private async unpublishCurrentNote(): Promise<void> {
    try {
      const slug = await this.resolveSlugFromActiveNote();
      if (!slug) {
        return;
      }

      if (this.settings.confirmBeforeUnpublish) {
        const confirmed = window.confirm(`Unpublish ${this.resolvePublicUrl(slug)}?`);
        if (!confirmed) {
          return;
        }
      }

      const result = await unpublishNote({
        slug,
        settings: this.settings,
        github: this.createGitHubClient(),
        deleteAssets: true
      });

      new Notice(
        result.status === "already-unpublished"
          ? `Already unpublished: ${slug}`
          : `Unpublished: ${slug}`
      );
    } catch (error) {
      new Notice(formatFailureNotice(error));
    }
  }

  private async copyPublicUrl(): Promise<void> {
    try {
      const slug = await this.resolveSlugFromActiveNote();
      if (!slug) {
        return;
      }

      const publicUrl = this.resolvePublicUrl(slug);
      await navigator.clipboard.writeText(publicUrl);
      new Notice(`Copied: ${publicUrl}`);
    } catch (error) {
      new Notice(formatFailureNotice(error));
    }
  }

  private async openPublicUrl(): Promise<void> {
    try {
      const slug = await this.resolveSlugFromActiveNote();
      if (!slug) {
        return;
      }

      window.open(this.resolvePublicUrl(slug), "_blank");
    } catch (error) {
      new Notice(formatFailureNotice(error));
    }
  }

  private async publishAllMarkedNotes(): Promise<void> {
    const adapter = new ObsidianPublisherAdapter(this.app);
    const github = this.createGitHubClient();
    let published = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of adapter.getMarkdownFiles()) {
      try {
        const note = await adapter.readNoteFile(file);
        const parsed = matter(note.markdown);
        if (parsed.data.publish !== true) {
          skipped += 1;
          continue;
        }

        // Batch publish is itself the explicit user action, so it auto-approves
        // the per-note manifest instead of stacking one modal per note. The
        // pre-publish safety (slug-collision check, unsupported-embed rejection)
        // still runs inside publishCurrentNote.
        await publishCurrentNote({
          note,
          settings: this.settings,
          github,
          adapter: this.buildPublisherAdapter(adapter, async () => true)
        });
        published += 1;
      } catch (error) {
        console.error(error);
        failed += 1;
      }
    }

    new Notice(`Published: ${published}\nSkipped: ${skipped}\nFailed: ${failed}`);
  }
}
