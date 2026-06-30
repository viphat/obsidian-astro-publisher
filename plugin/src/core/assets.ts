export function assertNoAssetNameCollisions(filenames: string[]): void {
  const seen = new Set<string>();
  for (const filename of filenames) {
    const normalized = filename.toLowerCase();
    if (seen.has(normalized)) {
      throw new Error(`Cannot publish this note because more than one embedded asset is named "${filename}".`);
    }
    seen.add(normalized);
  }
}
