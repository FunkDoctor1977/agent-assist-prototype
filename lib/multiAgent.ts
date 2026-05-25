// Multi-agent orchestrator for Agent Assist live mode.
//
// Instead of a single Claude call that does everything, we fan out to three
// focused sub-agents that run in parallel and each have a tight, single-task
// prompt:
//
//   1. Intent Agent       — classifies what the customer wants right now
//   2. Sentiment Agent    — labels sentiment and escalation risk
//   3. Guidance Agent     — drafts the next-action guidance for the human agent,
//                            grounded in retrieved KB snippets
//
// Each sub-agent's latency, status, and result are surfaced back to the UI so
// the multi-agent architecture is visible in the demo. If a single sub-agent
// fails, we degrade gracefully — the other two still ship results.
//
// Why this is interesting in interviews: it demonstrates real parallel agent
// orchestration with retrieval grounding, which is the dominant 2026 LLM-app
// architectural pattern.

import Anthropic from "@anthropic-ai/sdk";
import type { TranscriptLine } from "./mockTranscript";
import type { KbHit } from "./kbStore";

const MODEL = "claude-haiku-4-5-20251001";

export type AgentStatus = "ok" | "error";

export type SubAgentTrace = {
  name: string;
  model: string;
  status: AgentStatus;
  latencyMs: number;
  error: string | null;
};

export type MultiAgentInsight = {
  intent: string;
  sentiment: "positive" | "neutral" | "negative" | "frustrated" | "at-risk";
  escalationRisk: "low" | "medium" | "high";
  suggestedResponse: string;
};

export type MultiAgentResult = {
  insight: MultiAgentInsight;
  traces: SubAgentTrace[];
  totalMs: number;
};

function buildTranscript(conv: TranscriptLine[]): string {
  return conv.map((l) => `${l.speaker.toUpperCase()}: ${l.text}`).join("\n");
}

function buildKbBlock(hits: KbHit[]): string {
  if (hits.length === 0) return "";
  return (
    "\n\nKB snippets retrieved by vector search (use these to ground your advice):\n" +
    hits
      .map((h, i) => `[${i + 1}] (${h.docFilename}, score=${h.score.toFixed(3)})\n${h.text}`)
      .join("\n\n")
  );
}

async function callClaude(client: Anthropic, system: string, user: string, maxTokens: number): Promise<string> {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = resp.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Empty response");
  return block.text.trim();
}

function stripJsonFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

const INTENT_SYSTEM = `You are an intent classification specialist for contact-centre calls.
Given the customer's latest utterance plus the full conversation, return ONLY a short noun phrase (5-12 words) describing what the customer wants RIGHT NOW.
No explanation, no JSON, no quotes. Just the noun phrase.

Examples of good output:
- Password reset failing — email not recognised
- Repeat caller, frustration with unresolved issue
- Considering switching provider due to repeated failures`;

const SENTIMENT_SYSTEM = `You are a sentiment and escalation-risk analyst for contact-centre calls.
Return a single JSON object: {"sentiment": "<value>", "escalationRisk": "<value>"}

sentiment must be one of: positive, neutral, negative, frustrated, at-risk
escalationRisk must be one of: low, medium, high

Definitions:
- positive: customer is happy, complimentary
- neutral: factual exchange, no emotional charge
- negative: mild frustration, dissatisfaction
- frustrated: explicit annoyance, raised tone, repeated issue
- at-risk: explicit churn threat ("cancel", "moving providers"), legal language

Reply with the JSON object and nothing else.`;

const GUIDANCE_SYSTEM = `You are a response advisor for contact-centre agents.
Given the customer's latest utterance, the conversation context, and (optionally) KB snippets retrieved by vector search, write a 1-2 sentence next-action guidance for the human agent.
Write it as guidance to the agent, NOT as the agent's literal next line.
When KB snippets are provided, ground your guidance in them.
Reply with the guidance text only — no preamble, no JSON, no quotes.`;

type IntentTrace = { value: string | null; trace: SubAgentTrace };
type SentimentTrace = {
  value: { sentiment: MultiAgentInsight["sentiment"]; escalationRisk: MultiAgentInsight["escalationRisk"] } | null;
  trace: SubAgentTrace;
};
type GuidanceTrace = { value: string | null; trace: SubAgentTrace };

async function intentAgent(client: Anthropic, transcript: string, latest: string): Promise<IntentTrace> {
  const t0 = Date.now();
  const trace: SubAgentTrace = { name: "Intent", model: MODEL, status: "ok", latencyMs: 0, error: null };
  try {
    const out = await callClaude(
      client,
      INTENT_SYSTEM,
      `Conversation so far:\n${transcript}\n\nLatest customer line: "${latest}"\n\nReturn just the intent phrase.`,
      80
    );
    trace.latencyMs = Date.now() - t0;
    return { value: out.split("\n")[0].trim().replace(/^["']|["']$/g, "").slice(0, 200), trace };
  } catch (e) {
    trace.status = "error";
    trace.error = e instanceof Error ? e.message : String(e);
    trace.latencyMs = Date.now() - t0;
    return { value: null, trace };
  }
}

async function sentimentAgent(client: Anthropic, transcript: string, latest: string): Promise<SentimentTrace> {
  const t0 = Date.now();
  const trace: SubAgentTrace = { name: "Sentiment", model: MODEL, status: "ok", latencyMs: 0, error: null };
  try {
    const out = stripJsonFences(
      await callClaude(
        client,
        SENTIMENT_SYSTEM,
        `Conversation so far:\n${transcript}\n\nLatest customer line: "${latest}"\n\nReturn the JSON object.`,
        100
      )
    );
    const parsed = JSON.parse(out);
    trace.latencyMs = Date.now() - t0;
    return {
      value: {
        sentiment: parsed.sentiment,
        escalationRisk: parsed.escalationRisk,
      },
      trace,
    };
  } catch (e) {
    trace.status = "error";
    trace.error = e instanceof Error ? e.message : String(e);
    trace.latencyMs = Date.now() - t0;
    return { value: null, trace };
  }
}

async function guidanceAgent(client: Anthropic, transcript: string, latest: string, kbBlock: string): Promise<GuidanceTrace> {
  const t0 = Date.now();
  const trace: SubAgentTrace = {
    name: kbBlock ? "Guidance (RAG-grounded)" : "Guidance",
    model: MODEL,
    status: "ok",
    latencyMs: 0,
    error: null,
  };
  try {
    const out = await callClaude(
      client,
      GUIDANCE_SYSTEM,
      `Conversation so far:\n${transcript}\n\nLatest customer line: "${latest}"${kbBlock}\n\nReturn just the guidance text.`,
      280
    );
    trace.latencyMs = Date.now() - t0;
    return { value: out.replace(/^["']|["']$/g, "").trim(), trace };
  } catch (e) {
    trace.status = "error";
    trace.error = e instanceof Error ? e.message : String(e);
    trace.latencyMs = Date.now() - t0;
    return { value: null, trace };
  }
}

export async function runMultiAgent(opts: {
  apiKey: string;
  conversation: TranscriptLine[];
  latest: TranscriptLine;
  kbHits: KbHit[];
}): Promise<MultiAgentResult> {
  const overallStart = Date.now();
  const client = new Anthropic({ apiKey: opts.apiKey });
  const transcript = buildTranscript(opts.conversation);
  const kbBlock = buildKbBlock(opts.kbHits);

  const [intent, sentiment, guidance] = await Promise.all([
    intentAgent(client, transcript, opts.latest.text),
    sentimentAgent(client, transcript, opts.latest.text),
    guidanceAgent(client, transcript, opts.latest.text, kbBlock),
  ]);

  const insight: MultiAgentInsight = {
    intent: intent.value ?? "(intent unavailable)",
    sentiment: sentiment.value?.sentiment ?? "neutral",
    escalationRisk: sentiment.value?.escalationRisk ?? "low",
    suggestedResponse: guidance.value ?? "(guidance unavailable)",
  };

  return {
    insight,
    traces: [intent.trace, sentiment.trace, guidance.trace],
    totalMs: Date.now() - overallStart,
  };
}
