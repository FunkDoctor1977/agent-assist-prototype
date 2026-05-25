import { NextResponse } from "next/server";
import { mockInsights } from "@/lib/mockAi";
import { embed } from "@/lib/embeddings";
import { topK, totalChunks } from "@/lib/kbStore";
import { mockTranscript } from "@/lib/mockTranscript";

export const runtime = "nodejs";

// Demo mode: returns hand-crafted mock insights for each customer line.
// If the KB has been populated, KB snippets are replaced with REAL top-K hits
// from the uploaded documents so the demo visibly uses the user's content.
export async function POST(req: Request) {
  const body = (await req.json()) as { lineId: number };
  const baseInsight = mockInsights[body.lineId];

  await new Promise((r) => setTimeout(r, 600)); // small UX latency

  if (!baseInsight) {
    return NextResponse.json({ insight: null });
  }

  // If KB has content, retrieve relevant snippets against the actual customer line.
  if (totalChunks() > 0) {
    const customerLine = mockTranscript.find((l) => l.id === body.lineId);
    const queryText = customerLine?.text ?? baseInsight.intent;
    try {
      const queryEmbedding = await embed(queryText);
      const hits = topK(queryEmbedding, 3);
      if (hits.length > 0) {
        return NextResponse.json({
          insight: {
            ...baseInsight,
            kbSnippets: hits.map((h) => ({
              title: `${h.docFilename} · chunk ${h.chunkId.split("#")[1]}`,
              excerpt: h.text.length > 220 ? h.text.slice(0, 217) + "…" : h.text,
            })),
          },
          ragActive: true,
        });
      }
    } catch {
      // If embedding fails (model still downloading), fall through to canned snippets.
    }
  }

  return NextResponse.json({ insight: baseInsight });
}
