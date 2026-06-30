import { Modal, Setting } from "obsidian";

export class PublishManifestModal extends Modal {
  private accepted = false;

  constructor(app: ConstructorParameters<typeof Modal>[0], private readonly text: string) {
    super(app);
  }

  async openAndWait(): Promise<boolean> {
    this.open();
    return new Promise((resolve) => {
      this.onClose = () => resolve(this.accepted);
    });
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Publish note" });
    contentEl.createEl("pre", { text: this.text });
    new Setting(contentEl)
      .addButton((button) =>
        button.setButtonText("Cancel").onClick(() => {
          this.accepted = false;
          this.close();
        })
      )
      .addButton((button) =>
        button.setCta().setButtonText("Publish").onClick(() => {
          this.accepted = true;
          this.close();
        })
      );
  }
}
