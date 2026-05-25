import { NextResponse } from "next/server";
import { embed } from "@/lib/embeddings";
import { topK, totalChunks } from "@/lib/kbStore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { query?: string; k?: number } | null;
  const q = body?.query?.trim();
  if (!q) {
    return NextResponse.json({ hits: [], totalChunks: totalChunks() });
  }
  if (totalChunks() === 0) {
    return NextResponse.json({ hits: [], totalChunks: 0 });
  }
  try {
    const queryEmbedding = await embed(q);
    const hits = topK(queryEmbedding, body?.k ?? 3);
    return NextResponse.json({ hits, totalChunks: totalChunks() });
  } catch (e) {
    return NextResponse.json(
      { error: "Embedding failed: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }
}
