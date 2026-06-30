export function formatPublishedNotice(publicUrl: string): string {
  return `Published: ${publicUrl}`;
}

export function formatFailureNotice(error: unknown): string {
  return error instanceof Error ? error.message : "Publishing failed.";
}
