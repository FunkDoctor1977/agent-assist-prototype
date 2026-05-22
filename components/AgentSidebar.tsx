"use client";

import { AgentInsight } from "@/lib/mockAi";

type Props = {
  insight: AgentInsight | null;
  loading: boolean;
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

export function AgentSidebar({ insight, loading }: Props) {
  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-brand-50 to-white">
        <div className="text-sm font-semibold text-brand-700">Agent Assist</div>
        <div className="text-xs text-slate-500">Real-time AI co-pilot · prototype</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!insight && !loading && (
          <EmptyState />
        )}
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
        v0.1 · Insights generated from a hand-crafted fixture for demo purposes.
        Architecture is wired for Anthropic Claude — drop in an API key to switch to live LLM analysis.
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

function EmptyState() {
  return (
    <div className="text-sm text-slate-400 italic">
      Insights will appear here as the customer speaks…
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
