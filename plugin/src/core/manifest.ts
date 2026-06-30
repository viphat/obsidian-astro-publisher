export type PublishManifest = {
  localNotePath: string;
  destinationNotePath: string;
  publicUrl: string;
  assets: string[];
};

export function buildPublishManifestText(manifest: PublishManifest): string {
  const assetLines = manifest.assets.length > 0 ? manifest.assets.map((asset) => `- ${asset}`).join("\n") : "- No assets";

  return [
    "Publishing this note will make these files public:",
    "",
    `Local note: ${manifest.localNotePath}`,
    `Destination note: ${manifest.destinationNotePath}`,
    `Public URL: ${manifest.publicUrl}`,
    "",
    "Assets:",
    assetLines
  ].join("\n");
}
