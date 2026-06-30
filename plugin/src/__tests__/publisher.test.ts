import { describe, expect, it, vi } from "vitest";
import { publishCurrentNote } from "../publisher";

describe("publishCurrentNote", () => {
  it("uploads assets before markdown", async () => {
    const calls: string[] = [];
    const github = {
      getFile: vi.fn().mockResolvedValue(null),
      putFile: vi.fn().mockImplementation(async ({ path }: { path: string }) => {
        calls.push(path);
      })
    };

    await publishCurrentNote({
      note: {
        path: "Essays/How I Read Books.md",
        basename: "How I Read Books",
        markdown: "---\ntitle: How I Read Books\npublish: true\n---\n![[cover.png]]"
      },
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
        requirePublishManifestConfirmation: false
      },
      github,
      adapter: {
        readBinaryAsset: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
        writeFrontmatter: vi.fn(),
        listPublishedNotes: vi.fn().mockResolvedValue(new Map()),
        confirm: vi.fn().mockResolvedValue(true),
        today: () => "2026-06-30",
        generateSourceId: () => "obsidian-123"
      }
    });

    expect(calls).toEqual(["public/assets/notes/how-i-read-books/cover.png", "content/notes/how-i-read-books.md"]);
  });

  it("rejects an invalid slug and makes no GitHub calls", async () => {
    const github = {
      getFile: vi.fn(),
      putFile: vi.fn()
    };

    await expect(
      publishCurrentNote({
        note: { path: "日本語.md", basename: "日本語", markdown: "---\ntitle: 日本語\npublish: true\n---\nBody" },
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
          requirePublishManifestConfirmation: false
        },
        github,
        adapter: {
          readBinaryAsset: vi.fn(),
          writeFrontmatter: vi.fn(),
          listPublishedNotes: vi.fn().mockResolvedValue(new Map()),
          confirm: vi.fn().mockResolvedValue(true),
          today: () => "2026-06-30",
          generateSourceId: () => "obsidian-123"
        }
      })
    ).rejects.toThrow(/not a valid v1 slug/);

    expect(github.putFile).not.toHaveBeenCalled();
  });

  it("rejects slug collisions from a different source_id", async () => {
    const github = {
      getFile: vi.fn().mockResolvedValue({
        sha: "existing-sha",
        content: Buffer.from("---\ntitle: Other\nslug: how-i-read-books\nsource_id: obsidian-other\n---").toString("base64")
      }),
      putFile: vi.fn()
    };

    await expect(
      publishCurrentNote({
        note: { path: "Essays/How I Read Books.md", basename: "How I Read Books", markdown: "---\ntitle: How I Read Books\npublish: true\n---\nBody" },
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
          requirePublishManifestConfirmation: false
        },
        github,
        adapter: {
          readBinaryAsset: vi.fn(),
          writeFrontmatter: vi.fn(),
          listPublishedNotes: vi.fn().mockResolvedValue(new Map()),
          confirm: vi.fn().mockResolvedValue(true),
          today: () => "2026-06-30",
          generateSourceId: () => "obsidian-123"
        }
      })
    ).rejects.toThrow("already belongs to a different source_id");
  });
});
