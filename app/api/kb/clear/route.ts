import { NextResponse } from "next/server";
import { clearStore, removeDoc } from "@/lib/kbStore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { docId?: string } | null;
  if (body?.docId) {
    removeDoc(body.docId);
  } else {
    clearStore();
  }
  return NextResponse.json({ ok: true });
}
