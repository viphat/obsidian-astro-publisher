import { describe, expect, it, vi } from "vitest";
import { publishCurrentNote } from "../publisher";
import { deriveSourceId } from "../core/identity";

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
    ).rejects.toThrow(/produced no slug/);

    expect(github.putFile).not.toHaveBeenCalled();
  });

  it("publishes a CJK-titled note when an explicit slug is provided", async () => {
    const github = {
      getFile: vi.fn().mockResolvedValue(null),
      putFile: vi.fn()
    };

    const url = await publishCurrentNote({
      note: { path: "日本語.md", basename: "日本語", markdown: "---\ntitle: 日本語\nslug: japanese-note\npublish: true\n---\nBody" },
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
        updateLocalFrontmatterAfterPublish: false,
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
    });

    expect(url).toBe("https://notes.duongdao.family/notes/japanese-note");
    expect(github.putFile).toHaveBeenCalledWith(expect.objectContaining({ path: "content/notes/japanese-note.md" }));
  });

  it("re-publishes the same note without a self-collision when frontmatter is never written back", async () => {
    const settings = {
      githubOwner: "duongdao",
      githubRepo: "notes-site",
      githubBranch: "main",
      githubToken: "token",
      siteBaseUrl: "https://notes.duongdao.family",
      notesDirectory: "content/notes",
      assetsDirectory: "public/assets/notes",
      defaultLanguage: "en" as const,
      autoGenerateSlug: true,
      // Disabled: the generated source_id is never persisted to the local note,
      // so identity must stay stable purely from the deterministic derivation.
      updateLocalFrontmatterAfterPublish: false,
      confirmBeforePublishIfPublishFalse: true,
      confirmBeforeUnpublish: true,
      requirePublishManifestConfirmation: false
    };
    const note = {
      path: "Essays/How I Read Books.md",
      basename: "How I Read Books",
      markdown: "---\ntitle: How I Read Books\npublish: true\n---\nBody"
    };
    // In-memory GitHub store so the second publish sees the first publish's file.
    const store = new Map<string, { sha: string; content: string }>();
    const github = {
      getFile: vi.fn(async (path: string) => store.get(path) ?? null),
      putFile: vi.fn(async ({ path, content }: { path: string; content: string | ArrayBuffer }) => {
        store.set(path, { sha: `sha-${store.size}`, content: Buffer.from(content as string).toString("base64") });
      })
    };
    const adapter = {
      readBinaryAsset: vi.fn(),
      writeFrontmatter: vi.fn(),
      listPublishedNotes: vi.fn().mockResolvedValue(new Map()),
      confirm: vi.fn().mockResolvedValue(true),
      today: () => "2026-06-30",
      generateSourceId: (seed: string) => deriveSourceId(seed)
    };

    await publishCurrentNote({ note, settings, github, adapter });
    await expect(publishCurrentNote({ note, settings, github, adapter })).resolves.toBe(
      "https://notes.duongdao.family/notes/how-i-read-books"
    );

    const second = github.putFile.mock.calls[github.putFile.mock.calls.length - 1][0];
    expect(second.message).toBe("Update note: how-i-read-books");
    expect(second.sha).toBe("sha-0");
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
