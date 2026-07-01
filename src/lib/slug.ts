const SAFE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIACRITICS = /[̀-ͯ]/g;

export function isSafeSlug(slug: string): boolean {
  return SAFE_SLUG_PATTERN.test(slug);
}

export function getPublicPathForSlug(slug: string): string {
  if (!isSafeSlug(slug)) {
    throw new Error(`Invalid note slug: ${slug}`);
  }

  return `/notes/${slug}`;
}

// Tags are authored freely (spaces, uppercase, diacritics, nested `a/b`), so
// they must be slugified before use in a route param or href — otherwise the
// static tag route and the links pointing at it disagree and 404.
export function slugifyTag(tag: string): string {
  return tag
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function getTagPath(tag: string): string {
  return `/tags/${slugifyTag(tag)}`;
}
