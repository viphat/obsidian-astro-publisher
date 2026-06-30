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
});
