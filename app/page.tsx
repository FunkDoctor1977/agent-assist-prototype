"use client";

import { useEffect, useRef, useState } from "react";
import { mockTranscript } from "@/lib/mockTranscript";
import { TranscriptPlayer } from "@/components/TranscriptPlayer";
import { AgentSidebar } from "@/components/AgentSidebar";
import type { AgentInsight } from "@/lib/mockAi";

const LINE_INTERVAL_MS = 3500;

export default function Home() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [insight, setInsight] = useState<AgentInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Drive the transcript forward when playing.
  useEffect(() => {
    if (!isPlaying) return;
    if (visibleCount >= mockTranscript.length) {
      setIsPlaying(false);
      return;
    }
    tickRef.current = setInterval(() => {
      setVisibleCount((c) => Math.min(c + 1, mockTranscript.length));
    }, LINE_INTERVAL_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isPlaying, visibleCount]);

  // When a new line lands and it's a customer line, fetch an insight.
  useEffect(() => {
    if (visibleCount === 0) return;
    const latest = mockTranscript[visibleCount - 1];
    if (!latest || latest.speaker !== "customer") return;

    let cancelled = false;
    setLoadingInsight(true);
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId: latest.id }),
    })
      .then((r) => r.json())
      .then((data: { insight: AgentInsight | null }) => {
        if (cancelled) return;
        setInsight(data.insight);
        setLoadingInsight(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadingInsight(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visibleCount]);

  function handlePlayPause() {
    if (visibleCount >= mockTranscript.length) {
      // Already finished — start over.
      setVisibleCount(0);
      setInsight(null);
      setIsPlaying(true);
      return;
    }
    if (!isPlaying && visibleCount === 0) {
      // First start: show line 1 immediately, then tick through the rest.
      setVisibleCount(1);
    }
    setIsPlaying((p) => !p);
  }

  function handleReset() {
    setIsPlaying(false);
    setVisibleCount(0);
    setInsight(null);
    setLoadingInsight(false);
  }

  return (
    <main className="h-screen flex flex-col bg-slate-50">
      <header className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Agent Assist Prototype
          </h1>
          <div className="text-xs text-slate-500">
            Asim AI Lab · Live transcript + AI sidebar
          </div>
        </div>
        <a
          href="https://github.com/FunkDoctor1977/agent-assist-prototype"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-brand-600 hover:underline"
        >
          View on GitHub →
        </a>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[2fr_1fr] overflow-hidden">
        <TranscriptPlayer
          lines={mockTranscript}
          visibleCount={visibleCount}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onReset={handleReset}
        />
        <AgentSidebar insight={insight} loading={loadingInsight} />
      </div>
    </main>
  );
}
