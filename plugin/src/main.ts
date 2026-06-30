import { Notice, Plugin } from "obsidian";
import { GitHubContentsClient } from "./github/contentsClient";
import { ObsidianPublisherAdapter } from "./obsidianAdapter";
import { publishCurrentNote, type PublisherAdapter } from "./publisher";
import { AstroPublisherSettingTab, type AstroPublisherSettings, normalizeSettings } from "./settings";
import { PublishManifestModal } from "./ui/PublishManifestModal";
import { formatFailureNotice, formatPublishedNotice } from "./ui/messages";

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
      generateSourceId: () => adapter.generateSourceId()
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
}
