import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { extractText } from "@/lib/extractText";
import { chunkText } from "@/lib/textChunker";
import { embedBatch } from "@/lib/embeddings";
import { addDoc, type KbChunk, type KbDoc } from "@/lib/kbStore";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form data with a 'file' field." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' in form data." }, { status: 400 });
  }
  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  let text: string;
  try {
    text = await extractText(file.name, buffer);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
  if (!text.trim()) {
    return NextResponse.json({ error: `Extracted no text from ${file.name}.` }, { status: 400 });
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return NextResponse.json({ error: `No chunks produced for ${file.name}.` }, { status: 400 });
  }

  let embeddings: number[][];
  try {
    embeddings = await embedBatch(chunks.map((c) => c.text));
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to compute embeddings. The model may still be downloading on first run — try again in a moment. " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }

  const docId = randomUUID();
  const kbChunks: KbChunk[] = chunks.map((c, i) => ({
    id: `${docId}#${i}`,
    docId,
    docFilename: file.name,
    chunkIndex: i,
    text: c.text,
    embedding: embeddings[i],
  }));
  const approxTokens = chunks.reduce((a, c) => a + c.approxTokens, 0);
  const doc: KbDoc = {
    id: docId,
    filename: file.name,
    uploadedAt: Date.now(),
    chunkCount: chunks.length,
    approxTokens,
  };
  addDoc(doc, kbChunks);

  return NextResponse.json({ doc });
}
