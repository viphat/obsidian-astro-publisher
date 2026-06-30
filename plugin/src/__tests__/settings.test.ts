import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "../settings";

describe("Astro Publisher settings", () => {
  it("uses safe MVP defaults", () => {
    expect(DEFAULT_SETTINGS.githubBranch).toBe("main");
    expect(DEFAULT_SETTINGS.notesDirectory).toBe("content/notes");
    expect(DEFAULT_SETTINGS.assetsDirectory).toBe("public/assets/notes");
    expect(DEFAULT_SETTINGS.requirePublishManifestConfirmation).toBe(true);
  });

  it("normalizes missing settings without erasing configured values", () => {
    const settings = normalizeSettings({ githubOwner: "duongdao", githubRepo: "notes-site" });
    expect(settings.githubOwner).toBe("duongdao");
    expect(settings.githubRepo).toBe("notes-site");
    expect(settings.siteBaseUrl).toBe("https://notes.duongdao.family");
  });
});
