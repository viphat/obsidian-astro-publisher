const SUPPORTED_ASSET_EXTENSION = /\.(png|jpe?g|webp|gif|svg|pdf)$/i;

export type TransformMarkdownOptions = {
  publishedNotes: Map<string, string>;
  slug: string;
};

export type TransformMarkdownResult = {
  markdown: string;
  assetReferences: string[];
};

export function collectEmbeds(markdown: string): string[] {
  return Array.from(markdown.matchAll(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)).map((match) => match[1]);
}

export function transformObsidianMarkdown(markdown: string, options: TransformMarkdownOptions): TransformMarkdownResult {
  const assetReferences: string[] = [];

  const withImages = markdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_full, target: string, label?: string) => {
    if (!SUPPORTED_ASSET_EXTENSION.test(target)) {
      throw new Error(`Cannot publish this note because the embedded file "${target}" is not a supported asset.`);
    }

    assetReferences.push(target);
    const alt = label?.trim() || target.replace(/\.[^.]+$/, "");
    return `![${alt}](/assets/notes/${options.slug}/${target})`;
  });

  const withLinks = withImages.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_full, target: string, label?: string) => {
    const text = label?.trim() || target;
    const linkedSlug = options.publishedNotes.get(target);
    return linkedSlug ? `[${text}](/notes/${linkedSlug})` : text;
  });

  return { markdown: withLinks, assetReferences };
}
