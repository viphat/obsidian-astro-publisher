import { Notice, Plugin } from "obsidian";
import { AstroPublisherSettingTab, type AstroPublisherSettings, normalizeSettings } from "./settings";

export default class AstroPublisherPlugin extends Plugin {
  settings: AstroPublisherSettings = normalizeSettings(null);

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new AstroPublisherSettingTab(this.app, this));

    this.addCommand({
      id: "publish-current-note",
      name: "Publish current note",
      callback: () => new Notice("Astro Publisher loaded.")
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
