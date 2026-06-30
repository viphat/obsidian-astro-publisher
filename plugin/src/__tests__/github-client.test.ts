import { describe, expect, it, vi } from "vitest";
import { GitHubContentsClient } from "../github/contentsClient";

describe("GitHubContentsClient", () => {
  it("creates files with base64 content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ content: { sha: "new-sha" } }) });
    const client = new GitHubContentsClient({ owner: "duongdao", repo: "notes-site", branch: "main", token: "token", fetch: fetchMock });

    await client.putFile({ path: "content/notes/example.md", content: "hello", message: "Publish note: example" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/duongdao/notes-site/contents/content/notes/example.md",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ Authorization: "Bearer token" })
      })
    );

    const [, request] = fetchMock.mock.calls[0];
    expect(request.headers).toEqual({
      Accept: "application/vnd.github+json",
      Authorization: "Bearer token",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    });
    const body = JSON.parse(request.body);
    expect(body).toMatchObject({
      message: "Publish note: example",
      content: Buffer.from("hello", "utf8").toString("base64"),
      branch: "main"
    });
    expect(body).not.toHaveProperty("sha");
  });

  it("deletes files with sha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const client = new GitHubContentsClient({ owner: "duongdao", repo: "notes-site", branch: "main", token: "token", fetch: fetchMock });

    await client.deleteFile({ path: "content/notes/example.md", sha: "abc123", message: "Unpublish note: example" });

    const [, request] = fetchMock.mock.calls[0];
    expect(request.method).toBe("DELETE");
    expect(JSON.parse(request.body)).toMatchObject({ sha: "abc123", branch: "main" });
  });

  it("encodes path segments but keeps slashes between them", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ path: "public/assets/notes/how-i-read-books/my cover.png", sha: "asset-sha" })
    });
    const client = new GitHubContentsClient({ owner: "duongdao", repo: "notes-site", branch: "main", token: "token", fetch: fetchMock });

    await client.getFile("public/assets/notes/how-i-read-books/my cover.png");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.github.com/repos/duongdao/notes-site/contents/public/assets/notes/how-i-read-books/my%20cover.png"
    );
  });

  describe("listDirectory", () => {
    it("returns [] when the path does not exist (404)", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ message: "Not Found" }) });
      const client = new GitHubContentsClient({ owner: "duongdao", repo: "notes-site", branch: "main", token: "token", fetch: fetchMock });

      const result = await client.listDirectory("content/missing-dir");

      expect(result).toEqual([]);
    });

    it("maps array response to [{ path, sha }] and drops extra fields", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          { path: "content/notes/foo.md", sha: "sha-foo", type: "file", size: 123, url: "https://example.com" },
          { path: "content/notes/bar.md", sha: "sha-bar", type: "file", size: 456, url: "https://example.com" }
        ]
      });
      const client = new GitHubContentsClient({ owner: "duongdao", repo: "notes-site", branch: "main", token: "token", fetch: fetchMock });

      const result = await client.listDirectory("content/notes");

      expect(result).toEqual([
        { path: "content/notes/foo.md", sha: "sha-foo" },
        { path: "content/notes/bar.md", sha: "sha-bar" }
      ]);
    });

    it("throws when the response JSON is not an array (file path, not a directory)", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ path: "content/notes/foo.md", sha: "sha-foo", type: "file" })
      });
      const client = new GitHubContentsClient({ owner: "duongdao", repo: "notes-site", branch: "main", token: "token", fetch: fetchMock });

      await expect(client.listDirectory("content/notes/foo.md")).rejects.toThrow(/directory/);
    });
  });
});
