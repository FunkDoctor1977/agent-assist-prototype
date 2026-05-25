// Server-side embeddings via @xenova/transformers.
//
// First call downloads the model (~25 MB, cached afterwards in
// node_modules/@xenova/transformers/.cache). All subsequent calls are
// in-process and fast.
//
// Model: Xenova/all-MiniLM-L6-v2 — 384-dim sentence embeddings, well-suited
// to short KB chunks (300-500 tokens).

type Embedder = (text: string) => Promise<number[]>;

let embedderPromise: Promise<Embedder> | null = null;

async function loadEmbedder(): Promise<Embedder> {
  // Dynamic import so the heavy ONNX runtime is only loaded when first used.
  const { pipeline } = await import("@xenova/transformers");
  const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  return async (text: string) => {
    const output = await pipe(text, { pooling: "mean", normalize: true });
    // output.data is a TypedArray; convert to plain number[].
    return Array.from(output.data as Float32Array);
  };
}

export async function embed(text: string): Promise<number[]> {
  if (!embedderPromise) embedderPromise = loadEmbedder();
  const fn = await embedderPromise;
  return fn(text);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!embedderPromise) embedderPromise = loadEmbedder();
  const fn = await embedderPromise;
  // The model is small; we don't bother with proper batching — sequential is fine for prototype scale.
  const out: number[][] = [];
  for (const t of texts) out.push(await fn(t));
  return out;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  // Vectors from this pipeline are already L2-normalised, so the dot product
  // equals cosine similarity.
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
