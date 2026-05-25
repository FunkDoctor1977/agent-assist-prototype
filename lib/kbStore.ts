// In-memory knowledge-base store. Survives across requests within a single
// Next.js dev / production process, but is wiped on restart. This is the
// right shape for a prototype — for a real deployment swap this for a vector
// DB (Pinecone, Weaviate, pgvector, etc.).

import { cosineSimilarity } from "./embeddings";

export type KbDoc = {
  id: string;
  filename: string;
  uploadedAt: number;
  chunkCount: number;
  approxTokens: number;
};

export type KbChunk = {
  id: string;
  docId: string;
  docFilename: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
};

type Store = {
  docs: Map<string, KbDoc>;
  chunks: KbChunk[];
};

// Use a global to survive Next.js dev-time module reloads.
declare global {
  // eslint-disable-next-line no-var
  var __kbStore: Store | undefined;
}

function store(): Store {
  if (!globalThis.__kbStore) {
    globalThis.__kbStore = { docs: new Map(), chunks: [] };
  }
  return globalThis.__kbStore;
}

export function addDoc(doc: KbDoc, chunks: KbChunk[]) {
  const s = store();
  s.docs.set(doc.id, doc);
  s.chunks.push(...chunks);
}

export function removeDoc(docId: string) {
  const s = store();
  s.docs.delete(docId);
  s.chunks = s.chunks.filter((c) => c.docId !== docId);
}

export function clearStore() {
  const s = store();
  s.docs.clear();
  s.chunks = [];
}

export function listDocs(): KbDoc[] {
  return Array.from(store().docs.values()).sort((a, b) => b.uploadedAt - a.uploadedAt);
}

export function totalChunks(): number {
  return store().chunks.length;
}

export type KbHit = {
  chunkId: string;
  docFilename: string;
  text: string;
  score: number;
};

export function topK(queryEmbedding: number[], k: number, minScore = 0.25): KbHit[] {
  const s = store();
  if (s.chunks.length === 0) return [];
  const scored = s.chunks.map((c) => ({
    chunkId: c.id,
    docFilename: c.docFilename,
    text: c.text,
    score: cosineSimilarity(queryEmbedding, c.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((h) => h.score >= minScore).slice(0, k);
}
