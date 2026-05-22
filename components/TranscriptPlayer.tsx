"use client";

import { TranscriptLine } from "@/lib/mockTranscript";

type Props = {
  lines: TranscriptLine[];
  visibleCount: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
};

export function TranscriptPlayer({
  lines,
  visibleCount,
  isPlaying,
  onPlayPause,
  onReset,
}: Props) {
  const visible = lines.slice(0, visibleCount);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div>
          <div className="text-sm font-medium text-slate-700">Live call · Northwind Support</div>
          <div className="text-xs text-slate-500">Customer: James Miller · Agent: Sarah</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onPlayPause}
            className="px-3 py-1.5 text-sm font-medium rounded bg-brand-600 text-white hover:bg-brand-700"
          >
            {isPlaying ? "Pause" : visibleCount === 0 ? "Start call" : "Resume"}
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1.5 text-sm font-medium rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
        {visible.length === 0 && (
          <div className="text-sm text-slate-400 italic">
            Press <span className="font-medium">Start call</span> to begin streaming the transcript…
          </div>
        )}
        {visible.map((line) => (
          <div
            key={line.id}
            className={`flex ${line.speaker === "agent" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                line.speaker === "agent"
                  ? "bg-white border border-slate-200 text-slate-800"
                  : "bg-brand-600 text-white"
              }`}
            >
              <div className={`text-xs mb-0.5 ${line.speaker === "agent" ? "text-slate-500" : "text-brand-100"}`}>
                {line.speaker === "agent" ? "Agent" : "Customer"}
              </div>
              <div>{line.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
