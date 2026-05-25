// Extract plain text from an uploaded file based on its extension.
// Supports: PDF, DOCX, MD, TXT.
//
// Errors are returned as plain Error instances so the API route can surface
// the message verbatim to the user.

export type SupportedKind = "pdf" | "docx" | "md" | "txt";

export function detectKind(filename: string): SupportedKind | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "md" || ext === "markdown") return "md";
  if (ext === "txt") return "txt";
  return null;
}

export async function extractText(filename: string, buffer: Buffer): Promise<string> {
  const kind = detectKind(filename);
  if (!kind) {
    throw new Error(`Unsupported file type: ${filename}. Supported: .pdf, .docx, .md, .txt`);
  }

  if (kind === "pdf") {
    // Lazy import so the dependency only loads when actually needed.
    // pdf-parse's default export expects the buffer.
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text ?? "";
  }

  if (kind === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }

  // md / txt
  return buffer.toString("utf-8");
}
