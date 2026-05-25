// Split a plain-text document into semantically coherent chunks.
//
// Strategy:
// 1. Normalise whitespace.
// 2. Split on double-newline (paragraph) boundaries.
// 3. Greedily pack paragraphs into chunks targeting ~`targetChars` characters.
// 4. If a single paragraph exceeds targetChars, split on sentence boundaries.
// 5. Include a small `overlapChars` tail of each chunk as the head of the next
//    chunk to preserve context across boundaries.

export type Chunk = {
  text: string;
  // Approximate token count (chars / 4 — close enough for retrieval scoring).
  approxTokens: number;
};

const DEFAULT_TARGET = 1800; // chars (~450 tokens)
const DEFAULT_OVERLAP = 200; // chars (~50 tokens)

export function chunkText(
  raw: string,
  { targetChars = DEFAULT_TARGET, overlapChars = DEFAULT_OVERLAP }: { targetChars?: number; overlapChars?: number } = {}
): Chunk[] {
  const normalised = raw.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!normalised) return [];

  const paragraphs = normalised.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);

  // Pre-split paragraphs that are larger than targetChars on sentence boundaries.
  const units: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= targetChars) {
      units.push(p);
    } else {
      const sentences = p.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [p];
      let buf = "";
      for (const s of sentences) {
        if ((buf + s).length > targetChars && buf) {
          units.push(buf.trim());
          buf = s;
        } else {
          buf += s;
        }
      }
      if (buf.trim()) units.push(buf.trim());
    }
  }

  const chunks: Chunk[] = [];
  let current = "";
  for (const u of units) {
    const tentative = current ? current + "\n\n" + u : u;
    if (tentative.length > targetChars && current) {
      chunks.push({ text: current, approxTokens: Math.ceil(current.length / 4) });
      // Carry over a tail of the previous chunk for overlap.
      const tail = current.length > overlapChars ? current.slice(-overlapChars) : current;
      current = tail + "\n\n" + u;
    } else {
      current = tentative;
    }
  }
  if (current.trim()) {
    chunks.push({ text: current.trim(), approxTokens: Math.ceil(current.length / 4) });
  }

  return chunks;
}
