/** Decode the extension-owned JSON bytes at the filesystem boundary. */
export function decodeCheckpointText(bytes: Uint8Array): string {
  // Fail on invalid bytes instead of replacing them and rewriting corrupted data.
  // Preserve a BOM in the text so JSON parsing retains its existing strictness.
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
}
