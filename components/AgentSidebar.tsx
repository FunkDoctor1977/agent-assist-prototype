"use client";

import { AgentInsight } from "@/lib/mockAi";

type Mode = "demo" | "live";

type Props = {
  insight: AgentInsight | null;
  loading: boolean;
  error?: string | null;
  mode?: Mode;
  kbActive?: boolean;
};

const sentimentColour: Record<AgentInsight["sentiment"], string> = {
  positive: "bg-emerald-100 text-emerald-800",
  neutral: "bg-slate-100 text-slate-700",
  negative: "bg-amber-100 text-amber-800",
  frustrated: "bg-orange-100 text-orange-800",
  "at-risk": "bg-rose-100 text-rose-800",
};

const riskColour: Record<AgentInsight["escalationRisk"], string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-rose-500",
};

export function AgentSidebar({ insight, loading, error, mode = "demo", kbActive = false }: Props) {
  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-brand-50 to-white flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-brand-700">Agent Assist</div>
          <div className="text-xs text-slate-500">Real-time AI co-pilot · prototype</div>
        </div>
        <div className="flex items-center gap-1.5">
          {kbActive && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-indigo-100 text-indigo-800"
              title="Vector retrieval from uploaded KB is active"
            >
              RAG
            </span>
          )}
          {mode === "live" ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live · Claude API
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600">
              Demo · canned data
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && (
          <div className="mb-3 p-3 text-xs rounded border border-rose-200 bg-rose-50 text-rose-800">
            <div className="font-semibold mb-0.5">Live analysis error</div>
            <div className="break-words">{error}</div>
          </div>
        )}
        {!insight && !loading && !error && <EmptyState mode={mode} />}
        {loading && <Skeleton />}
        {insight && !loading && (
          <div className="space-y-4">
            <Section label="Customer intent">
              <div className="text-sm text-slate-800">{insight.intent}</div>
            </Section>

            <div className="grid grid-cols-2 gap-3">
              <Section label="Sentiment">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${sentimentColour[insight.sentiment]}`}
                >
                  {insight.sentiment.replace("-", " ")}
                </span>
              </Section>
              <Section label="Escalation risk">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${riskColour[insight.escalationRisk]}`} />
                  <span className="text-xs font-medium text-slate-700 capitalize">
                    {insight.escalationRisk}
                  </span>
                </div>
              </Section>
            </div>

            <Section label="Suggested next response">
              <div className="text-sm text-slate-800 bg-brand-50 border border-brand-100 rounded p-2.5 leading-relaxed">
                {insight.suggestedResponse}
              </div>
            </Section>

            {insight.kbSnippets.length > 0 && (
              <Section label="Knowledge base">
                <div className="space-y-2">
                  {insight.kbSnippets.map((kb, i) => (
                    <div
                      key={i}
                      className="text-xs border border-slate-200 rounded p-2 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="font-medium text-slate-800">{kb.title}</div>
                      <div className="text-slate-600 mt-0.5">{kb.excerpt}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500 leading-snug">
        {mode === "live"
          ? "v0.2 · Live mode: each customer line is sent to Anthropic Claude (Haiku 4.5) for real-time analysis. Your API key is held in memory only."
          : "v0.2 · Demo mode: insights from a hand-crafted fixture. Switch to Live mode (top right) to wire it to Claude with your own key."}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ mode }: { mode: Mode }) {
  return (
    <div className="text-sm text-slate-400 italic">
      {mode === "live"
        ? "Press Start call to begin streaming the script. Insights from Claude will appear here after each customer line."
        : "Insights will appear here as the customer speaks…"}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 bg-slate-200 rounded w-1/3" />
      <div className="h-4 bg-slate-200 rounded w-4/5" />
      <div className="h-3 bg-slate-200 rounded w-1/4 mt-4" />
      <div className="h-12 bg-slate-100 rounded" />
      <div className="h-3 bg-slate-200 rounded w-1/4 mt-4" />
      <div className="h-10 bg-slate-100 rounded" />
    </div>
  );
}
