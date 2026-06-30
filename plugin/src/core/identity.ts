// Deterministic, path-derived note identity. Using a stable hash of the note
// path (not a random UUID) keeps source_id constant across re-publishes even
// when the generated id is never written back to the local note
// (updateLocalFrontmatterAfterPublish off). Otherwise each publish would mint a
// new id and the note would collide with its own previously published copy. The
// path is hashed, so the public source_id never reveals the vault path.
export function deriveSourceId(seed: string): string {
  return `obsidian-${cyrb53(seed)}`;
}

// cyrb53: a fast, well-distributed non-cryptographic string hash producing a
// ~53-bit value. Identity only needs stability and low collision risk across
// distinct paths, not cryptographic strength.
function cyrb53(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash.toString(16);
}
