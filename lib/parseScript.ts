import { TranscriptLine } from "./mockTranscript";

// Parse a pasted script into a list of TranscriptLine.
// Each non-blank line becomes one message.
// Speaker prefixes recognised (case-insensitive):
//   "agent:" / "a:"  -> agent
//   "customer:" / "caller:" / "c:" -> customer
// Lines with no prefix default to "customer".
// Blank lines are skipped.
export function parseScript(raw: string): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  const rawLines = raw.split(/\r?\n/);
  let id = 1;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(agent|a|customer|caller|c)\s*[:\-]\s*(.+)$/i);
    let speaker: "agent" | "customer" = "customer";
    let text = trimmed;

    if (match) {
      const tag = match[1].toLowerCase();
      speaker = tag === "agent" || tag === "a" ? "agent" : "customer";
      text = match[2].trim();
    }

    if (!text) continue;
    lines.push({ id: id++, speaker, text });
  }

  return lines;
}
