export type GitHubContentsClientOptions = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  fetch?: typeof fetch;
};

export type GitHubFile = {
  path: string;
  sha: string;
  content?: string;
};

type PutFileInput = {
  path: string;
  content: string | ArrayBuffer;
  message: string;
  sha?: string;
};

type DeleteFileInput = {
  path: string;
  sha: string;
  message: string;
};

export class GitHubContentsClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: GitHubContentsClientOptions) {
    this.fetchImpl = options.fetch ?? fetch;
  }

  async getFile(path: string): Promise<GitHubFile | null> {
    const response = await this.request(path, { method: "GET" });
    if (response.status === 404) {
      return null;
    }
    await assertOk(response);
    const json = await response.json();
    let content = typeof json.content === "string" && json.content.length > 0 ? json.content : undefined;

    // Files larger than 1MB come back with the body omitted (content:"",
    // encoding:"none") and a download_url. Fetch the raw bytes and re-encode to
    // base64 so callers always get usable content — the source_id ownership
    // guard in the publisher depends on reading the existing note's frontmatter.
    if (content === undefined && typeof json.download_url === "string") {
      const raw = await this.fetchImpl(json.download_url);
      await assertOk(raw);
      content = Buffer.from(await raw.arrayBuffer()).toString("base64");
    }

    return { path: json.path, sha: json.sha, content };
  }

  async listDirectory(path: string): Promise<GitHubFile[]> {
    const response = await this.request(path, { method: "GET" });
    if (response.status === 404) {
      return [];
    }
    await assertOk(response);
    const json = await response.json();
    if (!Array.isArray(json)) {
      throw new Error(`Expected GitHub path "${path}" to be a directory.`);
    }
    return json.map((item) => ({ path: item.path, sha: item.sha }));
  }

  async putFile(input: PutFileInput): Promise<void> {
    const body: Record<string, string> = {
      message: input.message,
      content: encodeBase64(input.content),
      branch: this.options.branch
    };

    if (input.sha) {
      body.sha = input.sha;
    }

    const response = await this.request(input.path, {
      method: "PUT",
      body: JSON.stringify(body)
    });
    await assertOk(response);
  }

  async deleteFile(input: DeleteFileInput): Promise<void> {
    const response = await this.request(input.path, {
      method: "DELETE",
      body: JSON.stringify({
        message: input.message,
        sha: input.sha,
        branch: this.options.branch
      })
    });
    await assertOk(response);
  }

  private request(path: string, init: RequestInit): Promise<Response> {
    return this.fetchImpl(`https://api.github.com/repos/${this.options.owner}/${this.options.repo}/contents/${encodePath(path)}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.options.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
  }
}

function encodePath(path: string): string {
  // GitHub Contents API expects raw "/" between path segments. Encoding the
  // whole path (e.g. encodeURIComponent) would turn "/" into "%2F" and break
  // the request, so encode each segment and rejoin with literal slashes.
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function encodeBase64(content: string | ArrayBuffer): string {
  if (typeof content === "string") {
    return Buffer.from(content, "utf8").toString("base64");
  }
  return Buffer.from(content).toString("base64");
}

async function assertOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const message = await response.text().catch(() => "");
  throw new Error(`GitHub API request failed with ${response.status}: ${message}`);
}
