export const SITE_NAME = "Dương Đào Notes";

export function buildNoteTitle(title: string): string {
  return `${title} | ${SITE_NAME}`;
}

export function buildCanonicalUrl(site: string, pathname: string): string {
  const normalizedSite = site.replace(/\/$/, "");
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${normalizedSite}${normalizedPathname}`;
}
