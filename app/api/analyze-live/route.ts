import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AgentInsight } from "@/lib/mockAi";
import type { TranscriptLine } from "@/lib/mockTranscript";

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are Agent Assist, an AI co-pilot for contact-centre agents. Given the latest customer utterance in a live call, you provide structured guidance to the human agent.

You will receive the full conversation so far and the latest customer line that just landed. You return a single JSON object with this exact shape:

{
  "intent": "<short noun phrase describing what the customer wants right now>",
  "sentiment": "positive|neutral|negative|frustrated|at-risk",
  "escalationRisk": "low|medium|high",
  "suggestedResponse": "<one or two sentence next-action guidance for the agent — write it AS guidance, not as the agent's literal next line>",
  "kbSnippets": [
    { "title": "<KB article title>", "excerpt": "<short relevant excerpt, 1-2 lines>" }
  ]
}

Sentiment definitions:
- positive: customer is happy, satisfied, complimentary
- neutral: factual exchange, no emotional charge
- negative: mild frustration, dissatisfaction
- frustrated: explicit annoyance, repeated issue, raised tone
- at-risk: explicit churn threat, "I want to cancel", "moving providers", legal language

The kbSnippets array should contain 0-3 plausible knowledge-base entries that would actually help the agent in this moment. Invent reasonable titles like "KB-204: Legacy login migration" — they don't need to map to a real KB. Keep excerpts short and actionable.

Reply with the JSON object and absolutely nothing else. No prose, no markdown fences, no preamble.`;

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

  const userPrompt = `Full conversation so far:\n${transcriptText}\n\nThe latest customer line (analyse this one): "${latest.text}"\n\nReturn the JSON object only.`;

  const anthropic = new Anthropic({ apiKey: body.apiKey });

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Empty response from Claude" }, { status: 502 });
    }

    const raw = textBlock.text.trim();
    // Strip ```json fences if the model added them despite instructions.
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
      kbSnippets: Array.isArray(parsed.kbSnippets) ? parsed.kbSnippets : [],
    };

    return NextResponse.json({ insight });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /401|403|invalid.*api.*key|authentication/i.test(message) ? 401 : 502;
    return NextResponse.json({ error: `Claude API error: ${message}` }, { status });
  }
}
