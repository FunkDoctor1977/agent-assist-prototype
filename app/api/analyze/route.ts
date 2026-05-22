import { NextResponse } from "next/server";
import { mockInsights } from "@/lib/mockAi";

// In v0.1 this endpoint returns hand-crafted mock insights matched to each
// transcript line. In v0.2 it will be swapped for an Anthropic Claude API
// call; the response shape stays identical, so the client doesn't change.
export async function POST(req: Request) {
  const body = (await req.json()) as { lineId: number };
  const insight = mockInsights[body.lineId];

  // Simulate a small amount of latency so the UX feels like a real LLM call.
  await new Promise((r) => setTimeout(r, 600));

  if (!insight) {
    return NextResponse.json({ insight: null });
  }
  return NextResponse.json({ insight });
}
