import { describe, expect, it, vi } from "vitest";
import { unpublishNote } from "../publisher";

describe("unpublishNote", () => {
  it("deletes markdown and assets using sha values", async () => {
    const deleted: string[] = [];
    const github = {
      getFile: vi.fn().mockResolvedValue({ sha: "note-sha" }),
      listDirectory: vi.fn().mockResolvedValue([
        { path: "public/assets/notes/how-i-read-books/cover.png", sha: "asset-sha" }
      ]),
      deleteFile: vi.fn().mockImplementation(async ({ path }: { path: string }) => {
        deleted.push(path);
      })
    };

    const result = await unpublishNote({
      slug: "how-i-read-books",
      settings: {
        githubOwner: "duongdao",
        githubRepo: "notes-site",
        githubBranch: "main",
        githubToken: "token",
        siteBaseUrl: "https://notes.duongdao.family",
        notesDirectory: "content/notes",
        assetsDirectory: "public/assets/notes",
        defaultLanguage: "en",
        autoGenerateSlug: true,
        updateLocalFrontmatterAfterPublish: true,
        confirmBeforePublishIfPublishFalse: true,
        confirmBeforeUnpublish: true,
        requirePublishManifestConfirmation: true
      },
      github,
      deleteAssets: true
    });

    expect(deleted).toEqual([
      "content/notes/how-i-read-books.md",
      "public/assets/notes/how-i-read-books/cover.png"
    ]);
    expect(result).toEqual({ status: "unpublished", deletedAssets: 1 });
  });

  it("reports already-unpublished when the markdown file is missing", async () => {
    const github = {
      getFile: vi.fn().mockResolvedValue(null),
      listDirectory: vi.fn(),
      deleteFile: vi.fn()
    };

    const result = await unpublishNote({
      slug: "missing-note",
      settings: {
        githubOwner: "duongdao",
        githubRepo: "notes-site",
        githubBranch: "main",
        githubToken: "token",
        siteBaseUrl: "https://notes.duongdao.family",
        notesDirectory: "content/notes",
        assetsDirectory: "public/assets/notes",
        defaultLanguage: "en",
        autoGenerateSlug: true,
        updateLocalFrontmatterAfterPublish: true,
        confirmBeforePublishIfPublishFalse: true,
        confirmBeforeUnpublish: true,
        requirePublishManifestConfirmation: true
      },
      github,
      deleteAssets: true
    });

    expect(result).toEqual({ status: "already-unpublished", deletedAssets: 0 });
    expect(github.deleteFile).not.toHaveBeenCalled();
  });
});
