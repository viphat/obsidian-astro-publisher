const SAFE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSafeSlug(slug: string): boolean {
  return SAFE_SLUG_PATTERN.test(slug);
}

export function getPublicPathForSlug(slug: string): string {
  if (!isSafeSlug(slug)) {
    throw new Error(`Invalid note slug: ${slug}`);
  }

  return `/notes/${slug}`;
}
