import { NextResponse } from "next/server";
import type { AgentInsight } from "@/lib/mockAi";
import type { TranscriptLine } from "@/lib/mockTranscript";
import { embed } from "@/lib/embeddings";
import { topK, totalChunks, type KbHit } from "@/lib/kbStore";
import { runMultiAgent, type SubAgentTrace } from "@/lib/multiAgent";

export const runtime = "nodejs";

type Body = {
  apiKey: string;
  conversation: TranscriptLine[];
  latestLineId: number;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.apiKey || !body.apiKey.startsWith("sk-")) {
    return NextResponse.json(
      { error: "Missing or malformed Anthropic API key. It should start with 'sk-'." },
      { status: 400 }
    );
  }
  if (!Array.isArray(body.conversation) || body.conversation.length === 0) {
    return NextResponse.json({ error: "Empty conversation" }, { status: 400 });
  }

  const latest = body.conversation.find((l) => l.id === body.latestLineId);
  if (!latest || latest.speaker !== "customer") {
    return NextResponse.json({ insight: null });
  }

  // RAG: retrieve top-K KB chunks against the latest customer line.
  let kbHits: KbHit[] = [];
  let retrievalLatencyMs = 0;
  if (totalChunks() > 0) {
    const t0 = Date.now();
    try {
      const qEmb = await embed(latest.text);
      kbHits = topK(qEmb, 4);
    } catch {
      // KB unavailable — proceed without RAG.
    }
    retrievalLatencyMs = Date.now() - t0;
  }

  let multiAgent;
  try {
    multiAgent = await runMultiAgent({
      apiKey: body.apiKey,
      conversation: body.conversation,
      latest,
      kbHits,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /401|403|invalid.*api.*key|authentication/i.test(message) ? 401 : 502;
    return NextResponse.json({ error: `Claude API error: ${message}` }, { status });
  }

  // The KB snippets shown to the user are the *actual* retrieved chunks
  // (verbatim), not anything the LLM might have hallucinated.
  const kbSnippets =
    kbHits.length > 0
      ? kbHits.map((h) => ({
          title: `${h.docFilename} · chunk ${h.chunkId.split("#")[1]}`,
          excerpt: h.text.length > 220 ? h.text.slice(0, 217) + "…" : h.text,
        }))
      : [];

  const insight: AgentInsight = {
    lineId: latest.id,
    intent: multiAgent.insight.intent,
    sentiment: multiAgent.insight.sentiment,
    escalationRisk: multiAgent.insight.escalationRisk,
    suggestedResponse: multiAgent.insight.suggestedResponse,
    kbSnippets,
  };

  const retrievalTrace: SubAgentTrace | null =
    retrievalLatencyMs > 0
      ? {
          name: `KB Retrieval (top-${kbHits.length})`,
          model: "MiniLM-L6-v2 (local)",
          status: "ok",
          latencyMs: retrievalLatencyMs,
          error: null,
        }
      : null;

  return NextResponse.json({
    insight,
    ragActive: kbHits.length > 0,
    multiAgent: {
      totalMs: multiAgent.totalMs,
      traces: retrievalTrace ? [retrievalTrace, ...multiAgent.traces] : multiAgent.traces,
    },
  });
}
