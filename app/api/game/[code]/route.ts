import { NextRequest, NextResponse } from "next/server";
import { getGame } from "@/lib/store";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const game = await getGame(params.code.toUpperCase());
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  return NextResponse.json({ state: game });
}
