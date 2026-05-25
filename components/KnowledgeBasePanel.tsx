"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type KbDoc = {
  id: string;
  filename: string;
  uploadedAt: number;
  chunkCount: number;
  approxTokens: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onChange?: (totalChunks: number) => void;
};

export function KnowledgeBasePanel({ open, onClose, onChange }: Props) {
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/kb/list");
    const data = await res.json();
    setDocs(data.docs ?? []);
    setTotalChunks(data.totalChunks ?? 0);
    onChange?.(data.totalChunks ?? 0);
  }, [onChange]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/kb/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `Upload failed (${res.status})`);
      } else {
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      await uploadFile(f);
    }
  }

  async function removeDoc(id: string) {
    await fetch("/api/kb/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId: id }),
    });
    refresh();
  }

  async function clearAll() {
    await fetch("/api/kb/clear", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
    refresh();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md h-full bg-white border-l border-slate-200 shadow-xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Knowledge Base</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload PDF / DOCX / Markdown / TXT. Chunks are embedded locally with all-MiniLM-L6-v2.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-slate-400 bg-slate-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.md,.markdown,.txt"
              onChange={(e) => onFiles(e.target.files)}
              className="hidden"
            />
            <div className="text-sm text-slate-700 font-medium">
              {uploading ? "Embedding…" : "Drop files here, or click to browse"}
            </div>
            <div className="text-xs text-slate-500 mt-1">PDF · DOCX · MD · TXT</div>
            {uploading && (
              <div className="text-xs text-slate-500 mt-2 italic">
                First upload downloads the embedding model (~25 MB). Subsequent uploads are instant.
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 text-xs rounded border border-rose-200 bg-rose-50 text-rose-800">
              <div className="font-semibold mb-0.5">Upload error</div>
              <div className="break-words">{error}</div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Documents · {docs.length} · {totalChunks} chunks total
            </div>
            {docs.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-rose-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          {docs.length === 0 ? (
            <div className="text-sm text-slate-400 italic mt-2">
              No documents yet. Upload some and the analyzer will retrieve from them in real time.
            </div>
          ) : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.id} className="border border-slate-200 rounded p-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate">{d.filename}</div>
                      <div className="text-slate-500 mt-0.5">
                        {d.chunkCount} chunks · ~{d.approxTokens.toLocaleString()} tokens · uploaded {new Date(d.uploadedAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <button
                      onClick={() => removeDoc(d.id)}
                      className="text-slate-400 hover:text-rose-600 text-base leading-none"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
