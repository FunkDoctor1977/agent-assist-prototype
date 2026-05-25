import { NextResponse } from "next/server";
import { listDocs, totalChunks } from "@/lib/kbStore";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    docs: listDocs(),
    totalChunks: totalChunks(),
  });
}
