import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AgentInsight } from "@/lib/mockAi";
import type { TranscriptLine } from "@/lib/mockTranscript";
import { embed } from "@/lib/embeddings";
import { topK, totalChunks } from "@/lib/kbStore";

export const runtime = "nodejs";

const MODEL = "claude-haiku-4-5-20251001";

const BASE_SYSTEM_PROMPT = `You are Agent Assist, an AI co-pilot for contact-centre agents. Given the latest customer utterance in a live call, you provide structured guidance to the human agent.

You will receive the full conversation so far and the latest customer line. You may also receive a set of KB snippets retrieved by vector search from the organisation's own knowledge base. When KB snippets are provided, ground your guidance in them and reference them in kbSnippets. When no KB snippets are provided, invent plausible KB titles.

You return a single JSON object with this exact shape:

{
  "intent": "<short noun phrase describing what the customer wants right now>",
  "sentiment": "positive|neutral|negative|frustrated|at-risk",
  "escalationRisk": "low|medium|high",
  "suggestedResponse": "<one or two sentence next-action guidance for the agent>",
  "kbSnippets": [
    { "title": "<KB article title>", "excerpt": "<short relevant excerpt, 1-2 lines>" }
  ]
}

Sentiment definitions:
- positive: customer is happy
- neutral: factual, no emotional charge
- negative: mild frustration
- frustrated: explicit annoyance
- at-risk: explicit churn threat, "cancel", "moving providers", legal language

When provided KB snippets, populate kbSnippets with the most relevant 1-3 of them (use their actual title and a relevant short excerpt). When no KB snippets are provided, you may invent up to 3 plausible KB titles.

Reply with the JSON object and absolutely nothing else.`;

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

  const transcriptText = body.conversation
    .map((l) => `${l.speaker.toUpperCase()}: ${l.text}`)
    .join("\n");

  // RAG: retrieve top-K KB chunks against the latest customer line.
  let kbBlock = "";
  let ragHits: { title: string; excerpt: string }[] = [];
  if (totalChunks() > 0) {
    try {
      const qEmb = await embed(latest.text);
      const hits = topK(qEmb, 4);
      if (hits.length > 0) {
        ragHits = hits.map((h) => ({
          title: `${h.docFilename} · chunk ${h.chunkId.split("#")[1]}`,
          excerpt: h.text.length > 220 ? h.text.slice(0, 217) + "…" : h.text,
        }));
        kbBlock =
          "\n\nKB snippets retrieved by vector search (use these for grounding):\n" +
          hits
            .map((h, i) => `[${i + 1}] (${h.docFilename}, score=${h.score.toFixed(3)})\n${h.text}`)
            .join("\n\n");
      }
    } catch {
      // KB unavailable — proceed without RAG.
    }
  }

  const userPrompt = `Full conversation so far:\n${transcriptText}\n\nThe latest customer line (analyse this one): "${latest.text}"${kbBlock}\n\nReturn the JSON object only.`;

  const anthropic = new Anthropic({ apiKey: body.apiKey });

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: BASE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Empty response from Claude" }, { status: 502 });
    }

    const raw = textBlock.text.trim();
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: Omit<AgentInsight, "lineId">;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      return NextResponse.json(
        { error: "Claude returned non-JSON output", raw: stripped.slice(0, 400) },
        { status: 502 }
      );
    }

    const insight: AgentInsight = {
      lineId: latest.id,
      intent: parsed.intent ?? "(no intent returned)",
      sentiment: parsed.sentiment ?? "neutral",
      escalationRisk: parsed.escalationRisk ?? "low",
      suggestedResponse: parsed.suggestedResponse ?? "",
      kbSnippets:
        ragHits.length > 0
          ? ragHits // prefer the actual retrieved snippets over whatever Claude returned
          : Array.isArray(parsed.kbSnippets)
          ? parsed.kbSnippets
          : [],
    };

    return NextResponse.json({ insight, ragActive: ragHits.length > 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /401|403|invalid.*api.*key|authentication/i.test(message) ? 401 : 502;
    return NextResponse.json({ error: `Claude API error: ${message}` }, { status });
  }
}
