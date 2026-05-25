"use client";

import { useEffect, useRef, useState } from "react";
import { mockTranscript, type TranscriptLine } from "@/lib/mockTranscript";
import { parseScript } from "@/lib/parseScript";
import { TranscriptPlayer } from "@/components/TranscriptPlayer";
import { AgentSidebar } from "@/components/AgentSidebar";
import { LiveModeSetup } from "@/components/LiveModeSetup";
import { KnowledgeBasePanel } from "@/components/KnowledgeBasePanel";
import type { AgentInsight } from "@/lib/mockAi";

const LINE_INTERVAL_MS = 3500;

type Mode = "demo" | "live";

export default function Home() {
  const [mode, setMode] = useState<Mode>("demo");
  const [kbOpen, setKbOpen] = useState(false);
  const [kbChunkCount, setKbChunkCount] = useState(0);

  // Live mode state — only used when mode === "live"
  const [liveScript, setLiveScript] = useState<TranscriptLine[]>([]);
  const [liveApiKey, setLiveApiKey] = useState<string>("");
  const [liveStarted, setLiveStarted] = useState(false);

  const transcript = mode === "demo" ? mockTranscript : liveScript;
  const showSetup = mode === "live" && !liveStarted;

  const [visibleCount, setVisibleCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [insight, setInsight] = useState<AgentInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch the current KB state once on mount so the header badge is correct.
  useEffect(() => {
    fetch("/api/kb/list")
      .then((r) => r.json())
      .then((data: { totalChunks?: number }) => {
        if (typeof data.totalChunks === "number") setKbChunkCount(data.totalChunks);
      })
      .catch(() => {
        /* non-fatal */
      });
  }, []);

  // Drive the transcript forward when playing.
  useEffect(() => {
    if (!isPlaying) return;
    if (visibleCount >= transcript.length) {
      setIsPlaying(false);
      return;
    }
    tickRef.current = setInterval(() => {
      setVisibleCount((c) => Math.min(c + 1, transcript.length));
    }, LINE_INTERVAL_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isPlaying, visibleCount, transcript.length]);

  // When a new line lands and it's a customer line, fetch an insight.
  useEffect(() => {
    if (visibleCount === 0) return;
    const latest = transcript[visibleCount - 1];
    if (!latest || latest.speaker !== "customer") return;

    let cancelled = false;
    setLoadingInsight(true);
    setLiveError(null);

    const endpoint = mode === "demo" ? "/api/analyze" : "/api/analyze-live";
    const body =
      mode === "demo"
        ? { lineId: latest.id }
        : {
            apiKey: liveApiKey,
            conversation: transcript.slice(0, visibleCount),
            latestLineId: latest.id,
          };

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json() }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          setLiveError(data?.error ?? "Unknown error");
          setInsight(null);
        } else {
          setInsight(data.insight ?? null);
        }
        setLoadingInsight(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLiveError(e instanceof Error ? e.message : String(e));
        setLoadingInsight(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visibleCount, mode, transcript, liveApiKey]);

  function handlePlayPause() {
    if (visibleCount >= transcript.length) {
      // Already finished — start over.
      setVisibleCount(0);
      setInsight(null);
      setIsPlaying(true);
      return;
    }
    if (!isPlaying && visibleCount === 0) {
      setVisibleCount(1);
    }
    setIsPlaying((p) => !p);
  }

  function handleReset() {
    setIsPlaying(false);
    setVisibleCount(0);
    setInsight(null);
    setLoadingInsight(false);
    setLiveError(null);
  }

  function handleLiveStart(rawScript: string, apiKey: string) {
    const parsed = parseScript(rawScript);
    setLiveScript(parsed);
    setLiveApiKey(apiKey);
    setLiveStarted(true);
    setVisibleCount(0);
    setInsight(null);
    setIsPlaying(false);
    setLiveError(null);
  }

  function handleEditScript() {
    setLiveStarted(false);
    handleReset();
  }

  function handleModeChange(next: Mode) {
    if (next === mode) return;
    setMode(next);
    handleReset();
    if (next === "live") {
      setLiveStarted(false);
    }
  }

  return (
    <main className="h-screen flex flex-col bg-slate-50">
      <header className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Agent Assist Prototype
          </h1>
          <div className="text-xs text-slate-500">
            Asim AI Lab · Live transcript + AI sidebar
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setKbOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
            title="Upload PDFs / DOCX / MD / TXT — analyzed live by vector retrieval"
          >
            📚 KB
            {kbChunkCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                {kbChunkCount}
              </span>
            )}
          </button>
          <ModeToggle mode={mode} onChange={handleModeChange} />
          {mode === "live" && liveStarted && (
            <button
              onClick={handleEditScript}
              className="text-xs text-slate-600 underline hover:text-slate-900"
            >
              Edit script
            </button>
          )}
          <a
            href="https://github.com/FunkDoctor1977/agent-assist-prototype"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-600 hover:underline"
          >
            View on GitHub →
          </a>
        </div>
      </header>

      {showSetup ? (
        <LiveModeSetup onStart={handleLiveStart} />
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[2fr_1fr] overflow-hidden">
          <TranscriptPlayer
            lines={transcript}
            visibleCount={visibleCount}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onReset={handleReset}
          />
          <AgentSidebar
            insight={insight}
            loading={loadingInsight}
            error={liveError}
            mode={mode}
            kbActive={kbChunkCount > 0}
          />
        </div>
      )}

      <KnowledgeBasePanel
        open={kbOpen}
        onClose={() => setKbOpen(false)}
        onChange={setKbChunkCount}
      />
    </main>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="inline-flex rounded-md border border-slate-300 overflow-hidden text-xs">
      <button
        onClick={() => onChange("demo")}
        className={`px-3 py-1.5 font-medium ${
          mode === "demo" ? "bg-brand-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        Demo
      </button>
      <button
        onClick={() => onChange("live")}
        className={`px-3 py-1.5 font-medium border-l border-slate-300 ${
          mode === "live" ? "bg-brand-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        Live (BYO API key)
      </button>
    </div>
  );
}
