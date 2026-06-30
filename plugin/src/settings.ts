import { App, PluginSettingTab, Setting } from "obsidian";
import type AstroPublisherPlugin from "./main";

export type SupportedLanguage = "en" | "vi" | "zh" | "ja";

export type AstroPublisherSettings = {
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubToken: string;
  siteBaseUrl: string;
  notesDirectory: string;
  assetsDirectory: string;
  defaultLanguage: SupportedLanguage;
  autoGenerateSlug: boolean;
  updateLocalFrontmatterAfterPublish: boolean;
  confirmBeforePublishIfPublishFalse: boolean;
  confirmBeforeUnpublish: boolean;
  requirePublishManifestConfirmation: boolean;
};

export const DEFAULT_SETTINGS: AstroPublisherSettings = {
  githubOwner: "",
  githubRepo: "",
  githubBranch: "main",
  githubToken: "",
  siteBaseUrl: "https://notes.duongdao.family",
  notesDirectory: "content/notes",
  assetsDirectory: "public/assets/notes",
  defaultLanguage: "en",
  autoGenerateSlug: true,
  updateLocalFrontmatterAfterPublish: true,
  confirmBeforePublishIfPublishFalse: true,
  confirmBeforeUnpublish: true,
  requirePublishManifestConfirmation: true
};

export function normalizeSettings(saved: Partial<AstroPublisherSettings> | null | undefined): AstroPublisherSettings {
  return { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
}

export class AstroPublisherSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: AstroPublisherPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("GitHub owner").addText((text) =>
      text.setValue(this.plugin.settings.githubOwner).onChange(async (value) => {
        this.plugin.settings.githubOwner = value.trim();
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("GitHub repository").addText((text) =>
      text.setValue(this.plugin.settings.githubRepo).onChange(async (value) => {
        this.plugin.settings.githubRepo = value.trim();
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("GitHub branch").addText((text) =>
      text.setValue(this.plugin.settings.githubBranch).onChange(async (value) => {
        this.plugin.settings.githubBranch = value.trim() || DEFAULT_SETTINGS.githubBranch;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("GitHub token").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(this.plugin.settings.githubToken).onChange(async (value) => {
        this.plugin.settings.githubToken = value.trim();
        await this.plugin.saveSettings();
      });
    });

    new Setting(containerEl).setName("Site base URL").addText((text) =>
      text.setValue(this.plugin.settings.siteBaseUrl).onChange(async (value) => {
        this.plugin.settings.siteBaseUrl = value.trim().replace(/\/$/, "");
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Notes directory").addText((text) =>
      text.setValue(this.plugin.settings.notesDirectory).onChange(async (value) => {
        this.plugin.settings.notesDirectory = value.trim() || DEFAULT_SETTINGS.notesDirectory;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Assets directory").addText((text) =>
      text.setValue(this.plugin.settings.assetsDirectory).onChange(async (value) => {
        this.plugin.settings.assetsDirectory = value.trim() || DEFAULT_SETTINGS.assetsDirectory;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Default language").addDropdown((dropdown) => {
      dropdown
        .addOption("en", "English")
        .addOption("vi", "Vietnamese")
        .addOption("zh", "Chinese")
        .addOption("ja", "Japanese")
        .setValue(this.plugin.settings.defaultLanguage)
        .onChange(async (value) => {
          this.plugin.settings.defaultLanguage = value as SupportedLanguage;
          await this.plugin.saveSettings();
        });
    });

    new Setting(containerEl).setName("Auto-generate slug").addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.autoGenerateSlug).onChange(async (value) => {
        this.plugin.settings.autoGenerateSlug = value;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Update local frontmatter after publish").addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.updateLocalFrontmatterAfterPublish).onChange(async (value) => {
        this.plugin.settings.updateLocalFrontmatterAfterPublish = value;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Confirm before publishing notes without publish: true").addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.confirmBeforePublishIfPublishFalse).onChange(async (value) => {
        this.plugin.settings.confirmBeforePublishIfPublishFalse = value;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Confirm before unpublish").addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.confirmBeforeUnpublish).onChange(async (value) => {
        this.plugin.settings.confirmBeforeUnpublish = value;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Require publish manifest confirmation").addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.requirePublishManifestConfirmation).onChange(async (value) => {
        this.plugin.settings.requirePublishManifestConfirmation = value;
        await this.plugin.saveSettings();
      })
    );
  }
}
