// Minimal mock of the obsidian package for unit tests.
// The obsidian package is types-only (no JS) and only runs inside Obsidian desktop.

export class App {}
export class Plugin {
  app: App = new App();
  manifest = {};
  loadData = async (): Promise<unknown> => null;
  saveData = async (_data: unknown) => {};
  addSettingTab = (_tab: unknown) => {};
  addCommand = (_cmd: unknown) => {};
}
export class PluginSettingTab {
  containerEl = { empty: () => {} };
  constructor(_app: App, _plugin: Plugin) {}
}
export class Setting {
  constructor(_containerEl: unknown) {}
  setName(_name: string) { return this; }
  addText(_cb: (text: TextComponent) => unknown) { return this; }
  addToggle(_cb: (toggle: ToggleComponent) => unknown) { return this; }
  addDropdown(_cb: (dropdown: DropdownComponent) => unknown) { return this; }
}
export class Notice {
  constructor(_message: string) {}
}

class TextComponent {
  inputEl = { type: "" };
  setValue(_value: string) { return this; }
  onChange(_cb: (value: string) => unknown) { return this; }
}
class ToggleComponent {
  setValue(_value: boolean) { return this; }
  onChange(_cb: (value: boolean) => unknown) { return this; }
}
class DropdownComponent {
  addOption(_value: string, _display: string) { return this; }
  setValue(_value: string) { return this; }
  onChange(_cb: (value: string) => unknown) { return this; }
}
